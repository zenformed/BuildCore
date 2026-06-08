import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

export async function requireBuildCoreReportsAccess(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    return { ok: true };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'forbidden', message: 'Members cannot access reports.' },
      { status: 403 }
    ),
  };
}
