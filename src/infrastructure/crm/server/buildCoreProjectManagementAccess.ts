import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

export async function requireBuildCoreProjectManagementAccess(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  action: 'create' | 'delete'
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    return { ok: true };
  }

  const message =
    action === 'create' ? 'Members cannot create projects.' : 'Members cannot delete projects.';
  return {
    ok: false,
    response: NextResponse.json({ error: 'forbidden', message }, { status: 403 }),
  };
}
