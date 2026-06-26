/**
 * BuildCore payment milestone member visibility settings (BuildCore DB, not ForgeCore relay).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW,
  type BuildCoreWorkflowTaskMemberVisibilityInput,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  loadActiveBuildCoreMemberUserIdsForOrg,
  loadBuildCoreWorkflowTaskVisibilitySettings,
} from './buildCoreWorkflowTaskVisibilityService';

export type BuildCorePaymentVisibilitySettings = {
  readonly onlyAssignedUserCanView: boolean;
};

const DEFAULT_SETTINGS: BuildCorePaymentVisibilitySettings = {
  onlyAssignedUserCanView: DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW,
};

export async function loadBuildCorePaymentVisibilitySettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<BuildCorePaymentVisibilitySettings> {
  const { data, error } = await supabase
    .from('buildcore_payment_visibility_settings')
    .select('only_assigned_user_can_view')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error != null) {
    throw new Error(`buildcore_payment_visibility_read_failed: ${error.message}`);
  }

  if (data == null) return DEFAULT_SETTINGS;

  return {
    onlyAssignedUserCanView: Boolean(data.only_assigned_user_can_view),
  };
}

export async function saveBuildCorePaymentVisibilitySettings(
  supabase: SupabaseClient,
  organizationId: string,
  settings: BuildCorePaymentVisibilitySettings
): Promise<BuildCorePaymentVisibilitySettings> {
  const { data, error } = await supabase
    .from('buildcore_payment_visibility_settings')
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
    throw new Error(`buildcore_payment_visibility_write_failed: ${error?.message ?? 'unknown'}`);
  }

  return {
    onlyAssignedUserCanView: Boolean(data.only_assigned_user_can_view),
  };
}

export async function resolveBuildCorePaymentMemberVisibilityInput(
  supabase: SupabaseClient,
  organizationId: string,
  viewerUserId: string
): Promise<Pick<BuildCoreWorkflowTaskMemberVisibilityInput, 'viewerUserId' | 'onlyAssignedUserCanViewPayments' | 'memberRoleUserIds'>> {
  const [visibility, memberRoleUserIds] = await Promise.all([
    loadBuildCorePaymentVisibilitySettings(supabase, organizationId),
    loadActiveBuildCoreMemberUserIdsForOrg(supabase, organizationId),
  ]);

  return {
    viewerUserId,
    onlyAssignedUserCanViewPayments: visibility.onlyAssignedUserCanView,
    memberRoleUserIds,
  };
}

export async function resolveBuildCoreMemberTaskVisibilityInput(
  supabase: SupabaseClient,
  organizationId: string,
  viewerUserId: string
): Promise<BuildCoreWorkflowTaskMemberVisibilityInput> {
  const [workflowVisibility, paymentVisibility, memberRoleUserIds] = await Promise.all([
    loadBuildCoreWorkflowTaskVisibilitySettings(supabase, organizationId),
    loadBuildCorePaymentVisibilitySettings(supabase, organizationId),
    loadActiveBuildCoreMemberUserIdsForOrg(supabase, organizationId),
  ]);

  return {
    viewerUserId,
    onlyAssignedUserCanView: workflowVisibility.onlyAssignedUserCanView,
    onlyAssignedUserCanViewPayments: paymentVisibility.onlyAssignedUserCanView,
    memberRoleUserIds,
  };
}
