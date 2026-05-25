import { NextRequest, NextResponse } from 'next/server';
import { readRequestBearerToken } from '@/infrastructure/auth/readRequestBearer';
import { getMyAvatarBytes, getOrganizationMemberAvatarBytes } from '@/infrastructure/coreApi/userAvatarClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { getUserPhotoBuffer } from '@/infrastructure/userPhoto/UserPhotoService';
import { usesCoreUserAvatars } from '@/infrastructure/userPhoto/userPhotoAuthority';
import {
  createPlatformAvatarServiceClient,
  downloadPlatformUserAvatar,
  usersShareActiveOrganization,
} from '@/infrastructure/userAvatar/platformUserAvatarStorage';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/auth/user-avatar?userId=...
 * Same photo source as header `/api/auth/avatar` for the current user;
 * org members with platform avatars when service role is configured.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = readRequestBearerToken(request);
  if (token == null) {
    return new NextResponse(null, { status: 401 });
  }

  const authUser = await getSupabaseUserFromToken(`Bearer ${token}`);
  if (!authUser?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get('userId')?.trim() ?? '';
  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  }

  if (userId === authUser.id) {
    return serveCurrentUserAvatar(token);
  }

  if (usesCoreUserAvatars()) {
    const coreResult = await getOrganizationMemberAvatarBytes(token, userId);
    if (coreResult.ok) {
      return new NextResponse(coreResult.data.buffer, {
        headers: {
          'Content-Type': coreResult.data.contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    if (coreResult.error.kind === 'http_error' && coreResult.error.status === 403) {
      return new NextResponse(null, { status: 403 });
    }

    if (coreResult.error.kind !== 'http_error' || coreResult.error.status !== 404) {
      const service = createPlatformAvatarServiceClient();
      if (service != null) {
        const sameOrg = await usersShareActiveOrganization(service, authUser.id, userId);
        if (sameOrg) {
          const downloaded = await downloadPlatformUserAvatar(service, userId);
          if (downloaded != null) {
            return new NextResponse(downloaded.buffer, {
              headers: {
                'Content-Type': downloaded.contentType,
                'Cache-Control': 'private, max-age=3600',
              },
            });
          }
        }
      }
    }

    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 404 });
}

async function serveCurrentUserAvatar(token: string): Promise<NextResponse> {
  if (usesCoreUserAvatars()) {
    const result = await getMyAvatarBytes(token);
    if (!result.ok) {
      if (result.error.kind === 'http_error' && result.error.status === 404) {
        return new NextResponse(null, { status: 404 });
      }
      if (result.error.kind === 'http_error') {
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return NextResponse.json(upstream.json, { status: upstream.status });
        }
      }
      return NextResponse.json({ error: 'avatar_unavailable' }, { status: 502 });
    }
    return new NextResponse(result.data.buffer, {
      headers: {
        'Content-Type': result.data.contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  const authUser = await getSupabaseUserFromToken(`Bearer ${token}`);
  if (!authUser?.email) {
    return new NextResponse(null, { status: 401 });
  }

  const buffer = await getUserPhotoBuffer(authUser.email);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  const isSvg =
    buffer.length >= 5 &&
    ((buffer[0] === 0x3c && buffer[1] === 0x3f && buffer[2] === 0x78 && buffer[3] === 0x6d && buffer[4] === 0x6c) ||
      (buffer[0] === 0x3c && buffer[1] === 0x73 && buffer[2] === 0x76 && buffer[3] === 0x67));

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': isSvg ? 'image/svg+xml' : 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
