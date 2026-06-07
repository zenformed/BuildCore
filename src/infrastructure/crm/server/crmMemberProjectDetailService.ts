import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectDetail } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  applyBuildCoreMemberProjectDetailView,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import {
  loadActiveBuildCoreMemberUserIdsForOrg,
  loadActiveOrganizationMemberRole,
  loadBuildCoreWorkflowTaskVisibilitySettings,
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

  const [visibility, memberRoleUserIds] = await Promise.all([
    loadBuildCoreWorkflowTaskVisibilitySettings(supabase, organizationId),
    loadActiveBuildCoreMemberUserIdsForOrg(supabase, organizationId),
  ]);

  const visibleTasks = filterWorkflowTasksForBuildCoreMember(project.workflowTasks, {
    viewerUserId: userId,
    onlyAssignedUserCanView: visibility.onlyAssignedUserCanView,
    memberRoleUserIds,
  });

  return applyBuildCoreMemberProjectDetailView(project, visibleTasks);
}
