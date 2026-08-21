import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isBuildCoreProjectAccessScope,
  type BuildCoreProjectAccessScope,
} from '@/domain/buildcore/projectAccessScope';

/** Default preserves the behavior of every existing organization member. */
export const DEFAULT_BUILDCORE_PROJECT_ACCESS_SCOPE: BuildCoreProjectAccessScope = 'all';

export type BuildCoreProjectMemberAccessScope = {
  readonly userId: string;
  readonly projectAccessScope: BuildCoreProjectAccessScope;
};

/** Loads effective scopes for active members; Owner/Admin is always all. */
export async function loadEffectiveBuildCoreProjectAccessScopesForActiveMembers(
  supabase: SupabaseClient,
  organizationId: string
): Promise<readonly BuildCoreProjectMemberAccessScope[]> {
  const { data: members, error: membersError } = await supabase
    .from('platform_organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .eq('membership_status', 'active');
  if (membersError != null) {
    throw new Error(`buildcore_project_access_scope_members_read_failed: ${membersError.message}`);
  }

  const activeMembers = (members ?? []) as Array<{ user_id: string; role: string }>;
  if (activeMembers.length === 0) return [];
  const userIds = activeMembers.map((member) => member.user_id);
  const { data: accessRows, error: accessError } = await supabase
    .from('buildcore_project_member_access')
    .select('user_id, project_access_scope')
    .eq('organization_id', organizationId)
    .in('user_id', userIds);
  if (accessError != null) {
    throw new Error(`buildcore_project_access_scope_list_read_failed: ${accessError.message}`);
  }
  const configured = new Map(
    ((accessRows ?? []) as Array<{ user_id: string; project_access_scope: unknown }>)
      .filter((row) => isBuildCoreProjectAccessScope(row.project_access_scope))
      .map((row) => [row.user_id, row.project_access_scope as BuildCoreProjectAccessScope])
  );
  return activeMembers.map((member) => ({
    userId: member.user_id,
    projectAccessScope:
      member.role === 'owner' || member.role === 'admin'
        ? 'all'
        : configured.get(member.user_id) ?? DEFAULT_BUILDCORE_PROJECT_ACCESS_SCOPE,
  }));
}

export async function resolveBuildCoreProjectAccessScopeForUser(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCoreProjectAccessScope> {
  const { data: membership, error: membershipError } = await supabase
    .from('platform_organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('membership_status', 'active')
    .maybeSingle();
  if (membershipError != null) {
    throw new Error(`buildcore_project_access_scope_membership_read_failed: ${membershipError.message}`);
  }
  if (membership?.role === 'owner' || membership?.role === 'admin') {
    return 'all';
  }
  const { data, error } = await supabase
    .from('buildcore_project_member_access')
    .select('project_access_scope')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error != null) throw new Error(`buildcore_project_access_scope_read_failed: ${error.message}`);
  return isBuildCoreProjectAccessScope(data?.project_access_scope)
    ? data.project_access_scope
    : DEFAULT_BUILDCORE_PROJECT_ACCESS_SCOPE;
}

export async function userHasAssignedProjectAccess(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('id', projectId)
    .eq('assigned_member_id', userId)
    .maybeSingle();
  if (error != null) throw new Error(`buildcore_assigned_project_access_read_failed: ${error.message}`);
  return data != null;
}
