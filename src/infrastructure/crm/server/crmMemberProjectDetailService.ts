import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  applyBuildCoreMemberProjectDetailView,
  filterBudgetEntriesForBuildCoreMember,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  loadActiveOrganizationMemberRole,
  resolveBuildCoreWorkflowTaskMemberVisibilityInput,
} from './buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreRoleAccessForUser } from './buildCoreRoleAccessService';

export async function scopeCrmProjectDetailForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  project: CrmProjectDetail
): Promise<CrmProjectDetail> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    return project;
  }

  const visibilityInput = await resolveBuildCoreWorkflowTaskMemberVisibilityInput(
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

  return applyBuildCoreMemberProjectDetailView(project, visibleTasks, visibleBudgetEntries);
}
