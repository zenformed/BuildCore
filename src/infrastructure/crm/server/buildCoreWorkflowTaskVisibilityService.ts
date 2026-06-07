/**
 * BuildCore workflow task member visibility settings (BuildCore DB, not ForgeCore relay).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

export type BuildCoreWorkflowTaskVisibilitySettings = {
  readonly onlyAssignedUserCanView: boolean;
};

const DEFAULT_SETTINGS: BuildCoreWorkflowTaskVisibilitySettings = {
  onlyAssignedUserCanView: false,
};

export async function loadBuildCoreWorkflowTaskVisibilitySettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<BuildCoreWorkflowTaskVisibilitySettings> {
  const { data, error } = await supabase
    .from('buildcore_workflow_task_visibility_settings')
    .select('only_assigned_user_can_view')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error != null) {
    throw new Error(`buildcore_workflow_task_visibility_read_failed: ${error.message}`);
  }

  if (data == null) return DEFAULT_SETTINGS;

  return {
    onlyAssignedUserCanView: Boolean(data.only_assigned_user_can_view),
  };
}

export async function saveBuildCoreWorkflowTaskVisibilitySettings(
  supabase: SupabaseClient,
  organizationId: string,
  settings: BuildCoreWorkflowTaskVisibilitySettings
): Promise<BuildCoreWorkflowTaskVisibilitySettings> {
  const { data, error } = await supabase
    .from('buildcore_workflow_task_visibility_settings')
    .upsert(
      {
        organization_id: organizationId,
        only_assigned_user_can_view: settings.onlyAssignedUserCanView,
      },
      { onConflict: 'organization_id' }
    )
    .select('only_assigned_user_can_view')
    .single();

  if (error != null || data == null) {
    throw new Error(`buildcore_workflow_task_visibility_write_failed: ${error?.message ?? 'unknown'}`);
  }

  return {
    onlyAssignedUserCanView: Boolean(data.only_assigned_user_can_view),
  };
}

export async function loadActiveBuildCoreMemberUserIdsForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('platform_organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('membership_status', 'active')
    .eq('role', 'member');

  if (error != null) {
    throw new Error(`org_member_ids_read_failed: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => (row.user_id != null ? String(row.user_id) : ''))
    .filter((id) => id.length > 0);
}

export async function loadActiveOrganizationMemberRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRole | null> {
  const { data, error } = await supabase
    .from('platform_organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (error != null) {
    throw new Error(`org_member_role_read_failed: ${error.message}`);
  }

  const raw = data?.role != null ? String(data.role) : null;
  if (raw === 'owner' || raw === 'admin' || raw === 'coordinator' || raw === 'member') {
    return raw;
  }
  return null;
}
