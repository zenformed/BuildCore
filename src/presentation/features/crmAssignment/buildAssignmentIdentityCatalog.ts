import type { OrganizationWorkspaceSnapshot } from '@zenformed/core/organization-settings';
import { listBuildCoreAssignableMembers } from './buildCoreAssignableMembers';
import {
  type AssignmentIdentityCatalog,
  teamMemberRefFromOrgMember,
} from './assignmentIdentityModel';

export function buildAssignmentIdentityCatalog(
  snapshot: OrganizationWorkspaceSnapshot | null,
  subscriptionActive: boolean
): AssignmentIdentityCatalog | null {
  if (snapshot == null) return null;

  const byUserId = new Map<string, ReturnType<typeof teamMemberRefFromOrgMember>>();
  const byEmail = new Map<string, ReturnType<typeof teamMemberRefFromOrgMember>>();
  const assignableMembers: ReturnType<typeof teamMemberRefFromOrgMember>[] = [];

  for (const member of listBuildCoreAssignableMembers(snapshot, subscriptionActive)) {
    const ref = teamMemberRefFromOrgMember({
      userId: member.userId,
      displayName: member.displayName,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
    });
    byUserId.set(member.userId, ref);
    if (ref.email) {
      byEmail.set(ref.email.trim().toLowerCase(), ref);
    }
    assignableMembers.push(ref);
  }

  assignableMembers.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));

  return { byUserId, byEmail, assignableMembers };
}
