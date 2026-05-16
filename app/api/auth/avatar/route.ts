import { NextRequest, NextResponse } from 'next/server';
import { readRequestBearerToken } from '@/infrastructure/auth/readRequestBearer';
import { getMyAvatarBytes } from '@/infrastructure/coreApi/userAvatarClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { getUserPhotoBuffer } from '@/infrastructure/userPhoto/UserPhotoService';
import { usesCoreUserAvatars } from '@/infrastructure/userPhoto/userPhotoAuthority';

/**
 * GET /api/auth/avatar
 * SaaS + Core: Bearer JWT → ZenformedCore GET /users/me/avatar (no email query).
 * Fallback: local file-backed photo for the authenticated user's email.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (usesCoreUserAvatars()) {
    const emailParam = request.nextUrl.searchParams.get('email');
    if (emailParam != null && emailParam.trim() !== '') {
      return NextResponse.json({ error: 'email_query_not_allowed' }, { status: 400 });
    }
    const token = readRequestBearerToken(request);
    if (token == null) {
      return new NextResponse(null, { status: 401 });
    }
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

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse(null, { status: 401 });
  }
  const user = await getSupabaseUserFromToken(authHeader);
  if (!user?.email) {
    return new NextResponse(null, { status: 401 });
  }

  const buffer = await getUserPhotoBuffer(user.email);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  const isSvg =
    buffer.length >= 5 &&
    ((buffer[0] === 0x3c && buffer[1] === 0x3f && buffer[2] === 0x78 && buffer[3] === 0x6d && buffer[4] === 0x6c) ||
      (buffer[0] === 0x3c && buffer[1] === 0x73 && buffer[2] === 0x76 && buffer[3] === 0x67));
  const contentType = isSvg ? 'image/svg+xml' : 'image/png';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
