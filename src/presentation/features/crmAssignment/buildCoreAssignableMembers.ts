import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import type { ZenformedCoreOrganizationAppAccessResponse } from '@/infrastructure/coreApi/types';
import type { OrganizationWorkspaceSnapshot } from '@zenformed/core/organization-settings';

const BUILDCORE_APP_SLUG = buildcoreAppDefinition.appSlug;

type WorkspaceMember = NonNullable<OrganizationWorkspaceSnapshot['members']>[number];

export function memberHasBuildCoreAccess(
  member: WorkspaceMember,
  appAccess: ZenformedCoreOrganizationAppAccessResponse | null,
  subscriptionActive: boolean
): boolean {
  if (member.status !== 'active') return false;
  if (!subscriptionActive) return false;

  if (appAccess != null && appAccess.entries.length > 0) {
    const entry = appAccess.entries.find(
      (row) => row.userId === member.userId && row.appSlug === BUILDCORE_APP_SLUG
    );
    if (entry != null) {
      return entry.accessStatus === 'active';
    }
    return false;
  }

  return true;
}

export function listBuildCoreAssignableMembers(
  snapshot: OrganizationWorkspaceSnapshot | null,
  subscriptionActive: boolean
): readonly WorkspaceMember[] {
  const members = snapshot?.members?.filter((member) => member.status === 'active') ?? [];
  const appAccess = snapshot?.appAccess as ZenformedCoreOrganizationAppAccessResponse | null;
  return members.filter((member) => memberHasBuildCoreAccess(member, appAccess, subscriptionActive));
}
