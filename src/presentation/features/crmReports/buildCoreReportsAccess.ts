import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

/** Owner, admin, and coordinator may open BuildCore Reports (nav + /reports). */
export function canAccessBuildCoreReports(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return !isBuildCoreMemberRole(role);
}
