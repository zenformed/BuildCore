import type { SupabaseClient } from '@supabase/supabase-js';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

export class CrmProjectOriginAttributionError extends Error {}

/**
 * Resolves the only originator a server-side Project create may persist.
 * A normal create belongs to its authenticated actor. Owner/Admin may create
 * on behalf of another active member in the same organization.
 */
export async function resolveCrmProjectOriginatorForCreate(
  authSupabase: SupabaseClient,
  serviceSupabase: SupabaseClient,
  organizationId: string,
  actorUserId: string,
  requestedOriginatorUserId: string | null
): Promise<string> {
  const requested = requestedOriginatorUserId?.trim() || actorUserId;
  if (requested !== actorUserId) {
    const role = await loadActiveOrganizationMemberRole(authSupabase, organizationId, actorUserId);
    if (role !== 'owner' && role !== 'admin') {
      throw new CrmProjectOriginAttributionError(
        'Only an Owner or Admin can create a project on behalf of another member.'
      );
    }
  }

  const { data: member, error } = await serviceSupabase
    .from('platform_organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', requested)
    .eq('membership_status', 'active')
    .maybeSingle();
  if (error != null) {
    throw new CrmProjectOriginAttributionError(
      `Unable to verify project originator: ${error.message}`
    );
  }
  if (member == null) {
    throw new CrmProjectOriginAttributionError(
      'Project originator must be an active member of this organization.'
    );
  }
  return requested;
}
