import type { CrmContact, CrmTeamMemberRef } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';
import {
  type AssignmentIdentityCatalog,
  isAssignmentContactMemberId,
  teamMemberRefFromContact,
} from './assignmentIdentityModel';

export type AssigneeOption = {
  readonly id: string;
  readonly label: string;
  readonly member: CrmTeamMemberRef | null;
  readonly disabled?: boolean;
};

function assigneeOptionLabel(
  member: CrmTeamMemberRef,
  currentUserId: string | null | undefined,
  selfLabel: string | undefined
): string {
  if (currentUserId != null && currentUserId !== '' && member.id === currentUserId && selfLabel) {
    return selfLabel;
  }
  return member.displayName;
}

function memberToAssigneeOption(
  member: CrmTeamMemberRef,
  currentUserId: string | null | undefined,
  selfLabel: string | undefined
): AssigneeOption {
  return {
    id: member.id,
    label: assigneeOptionLabel(member, currentUserId, selfLabel),
    member,
  };
}

/** Unassigned, then current user, then other members (catalog sort preserved). */
function orderedMemberAssigneeOptions(
  members: readonly CrmTeamMemberRef[],
  currentUserId: string | null | undefined,
  selfLabel: string | undefined
): readonly AssigneeOption[] {
  const selfId = currentUserId?.trim() || null;
  const selfMember = selfId != null ? members.find((member) => member.id === selfId) : undefined;
  const otherMembers = members.filter((member) => member.id !== selfId);

  const options: AssigneeOption[] = [];
  if (selfMember != null) {
    options.push(memberToAssigneeOption(selfMember, currentUserId, selfLabel));
  }
  for (const member of otherMembers) {
    options.push(memberToAssigneeOption(member, currentUserId, selfLabel));
  }
  return options;
}

export function buildAssigneeOptions(input: {
  readonly isApiSource: boolean;
  readonly unassignedLabel: string;
  readonly selfLabel?: string;
  readonly currentUserId?: string | null;
  readonly catalog: AssignmentIdentityCatalog | null;
  readonly projectContact?: CrmContact | null;
}): readonly AssigneeOption[] {
  const unassigned: AssigneeOption = {
    id: '',
    label: input.unassignedLabel,
    member: null,
  };

  if (!input.isApiSource) {
    return [
      unassigned,
      ...orderedMemberAssigneeOptions(MOCK_CRM_TEAM_MEMBERS, input.currentUserId, input.selfLabel),
    ];
  }

  if (input.catalog == null || input.catalog.assignableMembers.length === 0) {
    return [unassigned];
  }

  const options: AssigneeOption[] = [
    unassigned,
    ...orderedMemberAssigneeOptions(
      input.catalog.assignableMembers,
      input.currentUserId,
      input.selfLabel
    ),
  ];

  if (input.projectContact != null) {
    const contactRef = teamMemberRefFromContact(input.projectContact);
    options.push({
      id: contactRef.id,
      label: content.crm.assignee.customerComingSoon,
      member: contactRef,
      disabled: true,
    });
  }

  return options;
}

export function normalizeAssigneeMemberIdForSave(memberId: string): string | null {
  const trimmed = memberId.trim();
  if (!trimmed) return null;
  if (isAssignmentContactMemberId(trimmed)) return null;
  return trimmed;
}
