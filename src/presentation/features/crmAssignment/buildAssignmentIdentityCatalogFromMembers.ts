import type { CrmTeamMemberRef } from '@/domain/crm';
import {
  type AssignmentIdentityCatalog,
  teamMemberRefFromOrgMember,
} from './assignmentIdentityModel';

export function buildAssignmentIdentityCatalogFromMembers(
  members: readonly CrmTeamMemberRef[]
): AssignmentIdentityCatalog {
  const byUserId = new Map<string, CrmTeamMemberRef>();
  const byEmail = new Map<string, CrmTeamMemberRef>();
  const assignableMembers: CrmTeamMemberRef[] = [];

  for (const member of members) {
    byUserId.set(member.id, member);
    if (member.email) {
      byEmail.set(member.email.trim().toLowerCase(), member);
    }
    assignableMembers.push(member);
  }

  assignableMembers.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  );

  return { byUserId, byEmail, assignableMembers };
}

export function mergeAssignmentIdentityCatalog(
  primary: AssignmentIdentityCatalog | null,
  fallbackMember: CrmTeamMemberRef | null
): AssignmentIdentityCatalog | null {
  if (primary == null && fallbackMember == null) return null;

  const members = new Map<string, CrmTeamMemberRef>();
  for (const member of primary?.assignableMembers ?? []) {
    members.set(member.id, member);
  }
  if (fallbackMember != null) {
    members.set(fallbackMember.id, fallbackMember);
  }

  return buildAssignmentIdentityCatalogFromMembers([...members.values()]);
}

export function teamMemberRefFromSignedInUser(input: {
  readonly userId: string;
  readonly email?: string | null;
  readonly displayName?: string | null;
}): CrmTeamMemberRef {
  return teamMemberRefFromOrgMember({
    userId: input.userId,
    displayName: input.displayName?.trim() || input.email?.split('@')[0] || 'You',
    email: input.email ?? null,
  });
}
