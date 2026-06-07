import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  applyBuildCoreMemberProjectDetailView,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  loadActiveOrganizationMemberRole,
  resolveBuildCoreWorkflowTaskMemberVisibilityInput,
} from './buildCoreWorkflowTaskVisibilityService';

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

  const visibleTasks = filterWorkflowTasksForBuildCoreMember(project.workflowTasks, visibilityInput);

  return applyBuildCoreMemberProjectDetailView(project, visibleTasks);
}
