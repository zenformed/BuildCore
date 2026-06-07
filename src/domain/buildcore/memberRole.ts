import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

/** True when the signed-in user has the organization BuildCore member role. */
export function isBuildCoreMemberRole(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return role === 'member';
}

/** Owner, admin, and coordinator may manage Teams permission settings. */
export function isBuildCoreTeamsManagerRole(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return role === 'owner' || role === 'admin' || role === 'coordinator';
}
