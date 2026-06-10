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
 * Uses org membership role only — not `canViewTeamMembers`, which also allows
 * read-only access to the organization settings team list.
 */
export function canAccessBuildCoreTeams(input: BuildCoreTeamsAccessInput): boolean {
  return organizationRoleCanAccessBuildCoreTeams(input.role);
}
