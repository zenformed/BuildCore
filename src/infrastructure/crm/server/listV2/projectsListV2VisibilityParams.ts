/**
 * Resolve member-visibility RPC parameters for Projects list v2.
 * Non-members: unrestricted (matches scopeCrmProjectSummariesForViewer).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { loadActiveOrganizationMemberRole } from '../buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreMemberTaskVisibilityInput } from '../buildCorePaymentVisibilityService';
import { resolveBuildCoreRoleAccessForUser } from '../buildCoreRoleAccessService';
import { resolveBuildCoreMemberProjectVisibilityScope } from '../crmMemberProjectVisibilityService';
import type { BuildCoreMemberProjectVisibilityScope } from '@/domain/buildcore/buildCoreMemberProjectVisibility';

export type CrmProjectsListV2VisibilityRpcParams = {
  readonly restrictMemberVisibility: boolean;
  readonly onlyAssignedWorkflow: boolean;
  readonly onlyAssignedPayments: boolean;
  readonly includePayments: boolean;
  readonly memberRoleUserIds: readonly string[];
  /** Null when viewer is not restricted to the member project scope. */
  readonly memberScope: BuildCoreMemberProjectVisibilityScope | null;
};

export async function resolveCrmProjectsListV2VisibilityRpcParams(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<CrmProjectsListV2VisibilityRpcParams> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    return {
      restrictMemberVisibility: false,
      onlyAssignedWorkflow: false,
      onlyAssignedPayments: false,
      includePayments: false,
      memberRoleUserIds: [],
      memberScope: null,
    };
  }

  const [visibilityInput, paymentAccess, memberScope] = await Promise.all([
    resolveBuildCoreMemberTaskVisibilityInput(supabase, organizationId, userId),
    resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'payments'),
    resolveBuildCoreMemberProjectVisibilityScope(supabase, organizationId, userId),
  ]);

  return {
    restrictMemberVisibility: true,
    onlyAssignedWorkflow: visibilityInput.onlyAssignedUserCanView,
    onlyAssignedPayments:
      visibilityInput.onlyAssignedUserCanViewPayments ??
      visibilityInput.onlyAssignedUserCanView,
    includePayments: paymentAccess.canView,
    memberRoleUserIds: [...visibilityInput.memberRoleUserIds],
    memberScope,
  };
}
