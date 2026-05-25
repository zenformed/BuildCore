import type { CrmContact, CrmTeamMemberRef } from '@/domain/crm';
import {
  displayNameFromEmail,
  displayNameFromProfileParts,
  initialsFromPersonName,
} from '@/domain/crm/teamMemberDisplay';

import {
  WORKFLOW_TASK_CONTACT_ASSIGNEE_PREFIX as ASSIGNMENT_CONTACT_ID_PREFIX,
  contactIdFromWorkflowTaskAssigneeId,
  isWorkflowTaskContactAssigneeId,
  workflowTaskAssigneeIdFromContactId,
} from '@/domain/crm/workflowTaskAssignee';

export { ASSIGNMENT_CONTACT_ID_PREFIX };

export type AssignmentIdentityCatalog = {
  readonly byUserId: ReadonlyMap<string, CrmTeamMemberRef>;
  readonly byEmail: ReadonlyMap<string, CrmTeamMemberRef>;
  readonly assignableMembers: readonly CrmTeamMemberRef[];
};

export { initialsFromPersonName, displayNameFromEmail };

export function isWeakAssignmentIdentityRef(ref: CrmTeamMemberRef): boolean {
  if (ref.id.startsWith(ASSIGNMENT_CONTACT_ID_PREFIX)) return false;
  if (/^Member [0-9a-f]{8}$/i.test(ref.displayName.trim())) return true;
  if (ref.initials.length === 2 && /^M[0-9A-F]/i.test(ref.initials) && ref.displayName.startsWith('Member ')) {
    return true;
  }
  return false;
}

export function teamMemberRefFromOrgMember(input: {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly avatarUrl?: string | null;
}): CrmTeamMemberRef {
  const displayName = displayNameFromProfileParts({
    displayName: input.displayName,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    userId: input.userId,
  });

  return {
    id: input.userId,
    displayName,
    initials: initialsFromPersonName(displayName),
    avatarUrl: input.avatarUrl ?? null,
    email: input.email,
  };
}

export function teamMemberRefFromContact(contact: CrmContact): CrmTeamMemberRef {
  const name = contact.name.trim() || 'Customer';
  return {
    id: workflowTaskAssigneeIdFromContactId(contact.id),
    displayName: `${name} (Customer)`,
    initials: initialsFromPersonName(name),
    avatarUrl: null,
    email: contact.email.trim() || null,
  };
}

export function isAssignmentContactMemberId(memberId: string): boolean {
  return isWorkflowTaskContactAssigneeId(memberId);
}

export { contactIdFromWorkflowTaskAssigneeId };

export function resolveAssignmentTeamMemberRef(
  ref: CrmTeamMemberRef | null,
  catalog: AssignmentIdentityCatalog | null
): CrmTeamMemberRef | null {
  if (ref == null) return null;
  if (ref.id.startsWith(ASSIGNMENT_CONTACT_ID_PREFIX)) {
    return {
      ...ref,
      initials: initialsFromPersonName(ref.displayName.replace(/\s*\(Customer\)\s*$/i, '')),
    };
  }

  const fromCatalog = catalog?.byUserId.get(ref.id);
  if (fromCatalog != null) {
    return {
      ...fromCatalog,
      avatarUrl: fromCatalog.avatarUrl ?? ref.avatarUrl,
      email: fromCatalog.email ?? ref.email,
    };
  }

  if (ref.email) {
    const fromEmail = catalog?.byEmail.get(ref.email.trim().toLowerCase());
    if (fromEmail != null) {
      return {
        ...fromEmail,
        id: ref.id,
        avatarUrl: fromEmail.avatarUrl ?? ref.avatarUrl,
      };
    }
  }

  if (isWeakAssignmentIdentityRef(ref)) {
    if (ref.email) {
      const displayName = displayNameFromEmail(ref.email, ref.id);
      return {
        ...ref,
        displayName,
        initials: initialsFromPersonName(displayName),
      };
    }
    return null;
  }

  return {
    ...ref,
    initials: initialsFromPersonName(ref.displayName),
  };
}
