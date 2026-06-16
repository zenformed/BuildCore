import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { hasUserPhoto } from '@/infrastructure/userPhoto/UserPhotoService';
import { usesCoreUserAvatars } from '@/infrastructure/userPhoto/userPhotoAuthority';
import { readRequestBearerToken } from '@/infrastructure/auth/readRequestBearer';
import { getMyAvatarMeta } from '@/infrastructure/coreApi/userAvatarClient';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

export const dynamic = 'force-dynamic';

const SAAS_MODE = runtimeModes.isSaasMode();

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, must-revalidate' };

async function resolveAvatarState(
  bearerToken: string | null,
  email: string | null
): Promise<{ hasPhoto: boolean; avatarRevision: string | null }> {
  if (usesCoreUserAvatars() && bearerToken != null) {
    const meta = await getMyAvatarMeta(bearerToken);
    if (meta.ok) {
      const revision =
        meta.data.revision ?? meta.data.updatedAt ?? (meta.data.hasAvatar ? '0' : null);
      return {
        hasPhoto: meta.data.hasAvatar,
        avatarRevision: meta.data.hasAvatar && revision != null ? revision : null,
      };
    }
    return { hasPhoto: false, avatarRevision: null };
  }
  if (!email) {
    return { hasPhoto: false, avatarRevision: null };
  }
  const hasPhoto = await hasUserPhoto(email);
  return {
    hasPhoto,
    avatarRevision: hasPhoto ? `local:${email.trim().toLowerCase()}` : null,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const bearerToken = readRequestBearerToken(request);
  const authHeader = request.headers.get('Authorization');

  if (SAAS_MODE && authHeader?.startsWith('Bearer ')) {
    const supabaseUser = await getSupabaseUserFromToken(authHeader);
    if (supabaseUser?.email) {
      const { hasPhoto, avatarRevision } = await resolveAvatarState(bearerToken, supabaseUser.email);
      return NextResponse.json(
        {
          user: null,
          role: null,
          hasPhoto,
          avatarRevision,
        },
        { headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(
      { user: null, role: null, hasPhoto: false, avatarRevision: null },
      { headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { error: 'bad_request', message: 'Zenformed Test App expects NEXT_PUBLIC_SAAS_MODE=true for /api/auth/me.' },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}
