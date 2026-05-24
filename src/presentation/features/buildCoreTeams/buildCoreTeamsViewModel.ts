import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import type {
  ZenformedCoreOrganizationAppAccessResponse,
  ZenformedCoreOrganizationMembersResponse,
} from '@/infrastructure/coreApi/types';
import type { OrganizationWorkspaceSnapshot } from '@zenformed/core/organization-settings';
import { formatOrganizationRoleLabel } from '@zenformed/core/dashboard-shell';

const BUILDCORE_APP_SLUG = buildcoreAppDefinition.appSlug;

type OrganizationMember = ZenformedCoreOrganizationMembersResponse['members'][number];

export type BuildCoreTeamMemberRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly organizationRoleLabel: string;
  readonly membershipStatus: OrganizationMember['status'];
  readonly buildCoreAccessStatus: 'enabled' | 'not_configured';
  readonly buildCoreRolePlaceholder: string;
};

export type BuildCoreTeamsPageModel = {
  readonly rows: readonly BuildCoreTeamMemberRow[];
  readonly canViewTeamMembers: boolean;
};

function formatBuildCoreAppRole(role: string): string {
  const trimmed = role.trim();
  if (!trimmed) return 'Not assigned';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function resolveBuildCoreAccessForMember(
  member: OrganizationMember,
  appAccess: ZenformedCoreOrganizationAppAccessResponse | null,
  subscriptionActive: boolean
): Pick<BuildCoreTeamMemberRow, 'buildCoreAccessStatus' | 'buildCoreRolePlaceholder'> {
  if (member.status !== 'active') {
    return { buildCoreAccessStatus: 'not_configured', buildCoreRolePlaceholder: '—' };
  }

  const entry = appAccess?.entries.find(
    (row) => row.userId === member.userId && row.appSlug === BUILDCORE_APP_SLUG
  );

  if (entry?.accessStatus === 'active') {
    return {
      buildCoreAccessStatus: 'enabled',
      buildCoreRolePlaceholder: formatBuildCoreAppRole(entry.role),
    };
  }

  const orgBuildCoreActive = appAccess?.orgApps.some(
    (app) => app.appSlug === BUILDCORE_APP_SLUG && app.isActive
  );

  if (subscriptionActive && orgBuildCoreActive && (appAccess?.entries.length ?? 0) === 0) {
    return {
      buildCoreAccessStatus: 'enabled',
      buildCoreRolePlaceholder: 'Not assigned',
    };
  }

  return {
    buildCoreAccessStatus: 'not_configured',
    buildCoreRolePlaceholder: 'Not assigned',
  };
}

export function buildBuildCoreTeamsPageModel(
  snapshot: OrganizationWorkspaceSnapshot | null,
  subscriptionActive: boolean
): BuildCoreTeamsPageModel {
  const canViewTeamMembers = snapshot?.membershipContext?.permissions.canViewTeamMembers ?? false;
  const members = snapshot?.members?.filter((member) => member.status !== 'removed') ?? [];
  const appAccess = snapshot?.appAccess as ZenformedCoreOrganizationAppAccessResponse | null;

  const rows: BuildCoreTeamMemberRow[] = members.map((member) => {
    const access = resolveBuildCoreAccessForMember(member, appAccess, subscriptionActive);
    return {
      id: member.id,
      name: member.displayName.trim() || 'Member',
      email: member.email,
      organizationRoleLabel: formatOrganizationRoleLabel(member.role) ?? member.role,
      membershipStatus: member.status,
      ...access,
    };
  });

  return { rows, canViewTeamMembers };
}
