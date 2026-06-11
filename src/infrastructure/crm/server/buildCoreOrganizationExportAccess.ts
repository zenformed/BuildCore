import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

export async function requireBuildCoreOrganizationExportAccess(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!organizationRoleCanManagePipelineStages(actorRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'forbidden',
          message: 'Only organization owners and admins can export organization data.',
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}
