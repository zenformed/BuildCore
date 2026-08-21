import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreProjectAccessScopeForUser } from './buildCoreProjectAccessScopeService';
import { isAssignedOnlyProjectAccess } from '@/domain/buildcore/projectAccessScope';

export async function requireBuildCoreReportsAccess(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  const projectScope = await resolveBuildCoreProjectAccessScopeForUser(
    supabase,
    organizationId,
    userId
  );
  if (isAssignedOnlyProjectAccess(projectScope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'forbidden', message: 'Restricted project access cannot use organization reports.' },
        { status: 403 }
      ),
    };
  }
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
