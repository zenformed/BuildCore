import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { hasUserPhoto } from '@/infrastructure/userPhoto/UserPhotoService';
import { usesCoreUserAvatars } from '@/infrastructure/userPhoto/userPhotoAuthority';
import { readRequestBearerToken } from '@/infrastructure/auth/readRequestBearer';
import { getMyAvatarMeta } from '@/infrastructure/coreApi/userAvatarClient';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

const SAAS_MODE = runtimeModes.isSaasMode();

async function resolveHasPhoto(bearerToken: string | null, email: string | null): Promise<boolean> {
  if (usesCoreUserAvatars() && bearerToken != null) {
    const meta = await getMyAvatarMeta(bearerToken);
    if (meta.ok) {
      return meta.data.hasAvatar;
    }
    return false;
  }
  if (!email) {
    return false;
  }
  return hasUserPhoto(email);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const bearerToken = readRequestBearerToken(request);
  const authHeader = request.headers.get('Authorization');

  if (SAAS_MODE && authHeader?.startsWith('Bearer ')) {
    const supabaseUser = await getSupabaseUserFromToken(authHeader);
    if (supabaseUser?.email) {
      const hasPhoto = await resolveHasPhoto(bearerToken, supabaseUser.email);
      return NextResponse.json({
        user: null,
        role: null,
        hasPhoto,
      });
    }
    return NextResponse.json({ user: null, role: null, hasPhoto: false });
  }

  return NextResponse.json(
    { error: 'bad_request', message: 'Zenformed Test App expects NEXT_PUBLIC_SAAS_MODE=true for /api/auth/me.' },
    { status: 400 }
  );
}
