import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import { organizationRoleCanAccessPipelineStagesAdmin } from '@/domain/buildcore/orgPipelineStages';

/** Owner and admin may export organization BuildCore data. */
export function canExportBuildCoreOrganizationData(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return organizationRoleCanAccessPipelineStagesAdmin(role);
}
