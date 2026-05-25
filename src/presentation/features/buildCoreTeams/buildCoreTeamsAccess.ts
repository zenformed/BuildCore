import type {
  OrganizationMemberRole,
  OrganizationPermissions,
} from '@zenformed/core/organization-settings';

export type BuildCoreTeamsAccessInput = {
  readonly role?: OrganizationMemberRole | null;
  readonly permissions?: OrganizationPermissions | null;
};

/** Interim org-role gate until BuildCore app-level RBAC replaces membership permissions. */
export function organizationRoleCanAccessBuildCoreTeams(
  role: OrganizationMemberRole | null | undefined
): boolean {
  return role === 'owner' || role === 'admin' || role === 'coordinator';
}

/**
 * Whether the signed-in user may open BuildCore Teams (nav + /teams).
 * Prefer Core `canViewTeamMembers`; fall back to org role when permissions are absent.
 */
export function canAccessBuildCoreTeams(input: BuildCoreTeamsAccessInput): boolean {
  if (input.permissions != null) {
    return input.permissions.canViewTeamMembers;
  }
  return organizationRoleCanAccessBuildCoreTeams(input.role);
}
