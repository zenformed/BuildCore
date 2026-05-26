import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

/** Owner, admin, and coordinator may save and manage project templates. */
export function canManageBuildCoreProjectTemplates(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return role === 'owner' || role === 'admin' || role === 'coordinator';
}
