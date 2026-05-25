import type { CrmContact, CrmTeamMemberRef } from '@/domain/crm';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';
import {
  type AssignmentIdentityCatalog,
  teamMemberRefFromContact,
} from './assignmentIdentityModel';
import type { AssigneeOption } from './buildAssigneeOptions';

function memberToAssigneeOption(
  member: CrmTeamMemberRef,
  label: string
): AssigneeOption {
  return { id: member.id, label, member };
}

function orderedMemberOptionsExcludingAssignee(
  members: readonly CrmTeamMemberRef[],
  currentAssigneeId: string | null | undefined,
  currentUserId: string | null | undefined,
  selfLabel: string | undefined
): readonly AssigneeOption[] {
  const activeId = currentAssigneeId?.trim() || null;
  const selfId = currentUserId?.trim() || null;
  const available = members.filter((member) => member.id !== activeId);
  const selfMember = selfId != null ? available.find((member) => member.id === selfId) : undefined;
  const otherMembers = available.filter((member) => member.id !== selfId);

  const options: AssigneeOption[] = [];
  if (selfMember != null && selfLabel) {
    options.push(memberToAssigneeOption(selfMember, selfLabel));
  }
  for (const member of otherMembers) {
    options.push(memberToAssigneeOption(member, member.displayName));
  }
  return options;
}

/** Unassigned → customer → assign to myself → other members (current assignee omitted). */
export function buildWorkflowTaskAssigneeOptions(input: {
  readonly isApiSource: boolean;
  readonly unassignedLabel: string;
  readonly customerLabel: string;
  readonly selfLabel?: string;
  readonly currentUserId?: string | null;
  readonly currentAssigneeId?: string | null;
  readonly catalog: AssignmentIdentityCatalog | null;
  readonly projectContact?: CrmContact | null;
}): readonly AssigneeOption[] {
  const unassigned: AssigneeOption = {
    id: '',
    label: input.unassignedLabel,
    member: null,
  };

  const activeId = input.currentAssigneeId?.trim() || null;

  if (!input.isApiSource) {
    const contactRef =
      input.projectContact != null ? teamMemberRefFromContact(input.projectContact) : null;
    const options: AssigneeOption[] = [unassigned];
    if (contactRef != null && activeId !== contactRef.id) {
      options.push(memberToAssigneeOption(contactRef, input.customerLabel));
    }
    options.push(
      ...orderedMemberOptionsExcludingAssignee(
        MOCK_CRM_TEAM_MEMBERS,
        activeId,
        input.currentUserId,
        input.selfLabel
      )
    );
    return options;
  }

  if (input.catalog == null || input.catalog.assignableMembers.length === 0) {
    const contactRef =
      input.projectContact != null ? teamMemberRefFromContact(input.projectContact) : null;
    if (contactRef != null && activeId !== contactRef.id) {
      return [unassigned, memberToAssigneeOption(contactRef, input.customerLabel)];
    }
    return [unassigned];
  }

  const options: AssigneeOption[] = [unassigned];

  if (input.projectContact != null) {
    const contactRef = teamMemberRefFromContact(input.projectContact);
    if (activeId !== contactRef.id) {
      options.push(memberToAssigneeOption(contactRef, input.customerLabel));
    }
  }

  options.push(
    ...orderedMemberOptionsExcludingAssignee(
      input.catalog.assignableMembers,
      activeId,
      input.currentUserId,
      input.selfLabel
    )
  );

  return options;
}

export function normalizeWorkflowTaskAssigneeIdForSave(memberId: string): string | null {
  const trimmed = memberId.trim();
  return trimmed.length > 0 ? trimmed : null;
}
