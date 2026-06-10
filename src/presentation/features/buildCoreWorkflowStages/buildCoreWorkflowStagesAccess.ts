import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import { organizationRoleCanAccessPipelineStagesAdmin } from '@/domain/buildcore/orgPipelineStages';

export function canAccessBuildCoreWorkflowStages(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return organizationRoleCanAccessPipelineStagesAdmin(role);
}

export function canManageBuildCoreWorkflowStages(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return organizationRoleCanAccessPipelineStagesAdmin(role);
}
