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
    const existing = members.get(fallbackMember.id);
    if (existing == null) {
      members.set(fallbackMember.id, fallbackMember);
    } else {
      members.set(fallbackMember.id, {
        ...existing,
        avatarUrl: existing.avatarUrl ?? fallbackMember.avatarUrl,
        email: existing.email ?? fallbackMember.email,
      });
    }
  }

  return buildAssignmentIdentityCatalogFromMembers([...members.values()]);
}

export function profilePartsFromUserMetadata(metadata: unknown): {
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly displayName: string | null;
} {
  if (metadata == null || typeof metadata !== 'object') {
    return { firstName: null, lastName: null, displayName: null };
  }
  const meta = metadata as Record<string, unknown>;
  return {
    firstName: typeof meta.first_name === 'string' ? meta.first_name : null,
    lastName: typeof meta.last_name === 'string' ? meta.last_name : null,
    displayName:
      typeof meta.full_name === 'string'
        ? meta.full_name
        : typeof meta.name === 'string'
          ? meta.name
          : null,
  };
}

export function teamMemberRefFromSignedInUser(input: {
  readonly userId: string;
  readonly email?: string | null;
  readonly displayName?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly avatarUrl?: string | null;
}): CrmTeamMemberRef {
  return teamMemberRefFromOrgMember({
    userId: input.userId,
    displayName: input.displayName ?? '',
    email: input.email ?? null,
    firstName: input.firstName,
    lastName: input.lastName,
    avatarUrl: input.avatarUrl,
  });
}
