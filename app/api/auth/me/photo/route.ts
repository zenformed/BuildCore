import { NextResponse } from 'next/server';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { readRequestBearerToken } from '@/infrastructure/auth/readRequestBearer';
import { deleteMyAvatar, putMyAvatarRaw } from '@/infrastructure/coreApi/userAvatarClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { saveUserPhoto, deleteUserPhoto } from '@/infrastructure/userPhoto/UserPhotoService';
import { usesCoreUserAvatars } from '@/infrastructure/userPhoto/userPhotoAuthority';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

export const dynamic = 'force-dynamic';

const DICEBEAR_URL = 'https://api.dicebear.com/9.x/fun-emoji/png';
const SAAS_MODE = runtimeModes.isSaasMode();

function isSvgBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 5 &&
    ((buffer[0] === 0x3c && buffer[1] === 0x3f && buffer[2] === 0x78 && buffer[3] === 0x6d && buffer[4] === 0x6c) ||
      (buffer[0] === 0x3c && buffer[1] === 0x73 && buffer[2] === 0x76 && buffer[3] === 0x67))
  );
}

async function getPhotoUserEmail(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (SAAS_MODE && authHeader?.startsWith('Bearer ')) {
    const user = await getSupabaseUserFromToken(authHeader);
    return user?.email ?? null;
  }
  return null;
}

async function relayPutToCore(
  token: string,
  buffer: Buffer,
  contentType: string
): Promise<NextResponse> {
  if (isSvgBuffer(buffer)) {
    return NextResponse.json(
      { error: 'unsupported_image_type', message: 'SVG avatars are not supported in SaaS mode.' },
      { status: 400 }
    );
  }
  const result = await putMyAvatarRaw(token, buffer, contentType);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (st === 400 || st === 413) {
        return NextResponse.json(
          { error: 'avatar_upload_rejected', detail: result.error.body },
          { status: st }
        );
      }
      const upstream = coreUpstreamHttpResponsePayload(result.error);
      if (upstream != null) {
        return NextResponse.json(upstream.json, { status: upstream.status });
      }
    }
    return NextResponse.json({ error: 'avatar_upload_failed' }, { status: 502 });
  }
  return NextResponse.json({ success: true, ...result.data });
}

/**
 * POST /api/auth/me/photo - Upload user photo
 * - multipart/form-data with field "photo" (File)
 * - OR application/json with { dicebearSeed: string } to use DiceBear avatar
 * In SaaS mode send Authorization: Bearer <supabase_access_token>.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const coreAvatars = usesCoreUserAvatars();
  const token = readRequestBearerToken(request);

  if (coreAvatars) {
    if (token == null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    const email = await getPhotoUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;
    if (!photo || photo.size === 0) {
      return NextResponse.json({ error: 'No photo file' }, { status: 400 });
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    const fileType = photo.type || 'application/octet-stream';
    if (coreAvatars && token != null) {
      return relayPutToCore(token, buffer, fileType);
    }
    const email = await getPhotoUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await saveUserPhoto(email, buffer);
    return NextResponse.json({ success: true });
  }

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    const seed = typeof body.dicebearSeed === 'string' ? body.dicebearSeed.trim() : null;
    if (!seed || seed.length > 64) {
      return NextResponse.json({ error: 'Invalid dicebearSeed' }, { status: 400 });
    }
    const url = `${DICEBEAR_URL}?seed=${encodeURIComponent(seed)}&size=256`;
    const res = await fetch(url, {
      headers: { Accept: 'image/png' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 502 });
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (coreAvatars && token != null) {
      return relayPutToCore(token, buffer, 'image/png');
    }
    const email = await getPhotoUserEmail(request);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await saveUserPhoto(email, buffer);
    return NextResponse.json({ success: true });
  }

  if (coreAvatars && token != null) {
    const raw = Buffer.from(await request.arrayBuffer());
    if (raw.length === 0) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }
    const declared = request.headers.get('content-type') ?? 'application/octet-stream';
    return relayPutToCore(token, raw, declared);
  }

  return NextResponse.json({ error: 'Expected multipart/form-data or application/json' }, { status: 400 });
}

/**
 * DELETE /api/auth/me/photo - Remove user photo
 * In SaaS mode send Authorization: Bearer <supabase_access_token>.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const coreAvatars = usesCoreUserAvatars();
  const token = readRequestBearerToken(request);

  if (coreAvatars) {
    if (token == null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await deleteMyAvatar(token);
    if (!result.ok) {
      if (result.error.kind === 'http_error') {
        const st = result.error.status;
        if (st === 401 || st === 403) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return NextResponse.json(upstream.json, { status: upstream.status });
        }
      }
      return NextResponse.json({ error: 'avatar_delete_failed' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  }

  const email = await getPhotoUserEmail(request);
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteUserPhoto(email);
  return NextResponse.json({ success: true });
}
