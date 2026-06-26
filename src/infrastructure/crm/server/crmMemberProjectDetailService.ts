import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  applyMinimalMemberParentProjectDetailView,
  isProjectAccessibleToMember,
  isProjectDirectlyVisibleToMember,
  maskProjectDetailContactEmailForMember,
} from '@/domain/buildcore/buildCoreMemberProjectVisibility';
import {
  applyBuildCoreMemberProjectDetailView,
  filterBudgetEntriesForBuildCoreMember,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  loadActiveOrganizationMemberRole,
} from './buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreMemberTaskVisibilityInput } from './buildCorePaymentVisibilityService';
import { resolveBuildCoreRoleAccessForUser } from './buildCoreRoleAccessService';
import { resolveBuildCoreMemberProjectVisibilityScope } from './crmMemberProjectVisibilityService';

export async function scopeCrmProjectDetailForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  project: CrmProjectDetail
): Promise<CrmProjectDetail | null> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    return project;
  }

  const scope = await resolveBuildCoreMemberProjectVisibilityScope(
    supabase,
    organizationId,
    userId
  );
  if (scope == null || !isProjectAccessibleToMember(project.summary.id, scope)) {
    return null;
  }

  const visibilityInput = await resolveBuildCoreMemberTaskVisibilityInput(
    supabase,
    organizationId,
    userId
  );
  const paymentAccess = await resolveBuildCoreRoleAccessForUser(
    supabase,
    organizationId,
    userId,
    'payments'
  );
  const budgetAccess = await resolveBuildCoreRoleAccessForUser(
    supabase,
    organizationId,
    userId,
    'budget'
  );

  const scopeInput = {
    ...visibilityInput,
    includePaymentsAssignedToViewer: paymentAccess.canView,
    includeBudgetForViewer: budgetAccess.canView,
  };

  const visibleTasks = filterWorkflowTasksForBuildCoreMember(project.workflowTasks, scopeInput);
  const visibleBudgetEntries = filterBudgetEntriesForBuildCoreMember(project.budget.entries, scopeInput);

  let scoped = applyBuildCoreMemberProjectDetailView(project, visibleTasks, visibleBudgetEntries);

  const isDirect = isProjectDirectlyVisibleToMember(project.summary.id, scope);
  if (!isDirect) {
    scoped = applyMinimalMemberParentProjectDetailView(scoped);
  } else {
    scoped = maskProjectDetailContactEmailForMember(scoped);
  }

  return scoped;
}
