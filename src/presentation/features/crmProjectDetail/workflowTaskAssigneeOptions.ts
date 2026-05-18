import type { CrmTeamMemberRef } from '@/domain/crm';
import { getUserInitials } from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';

export type WorkflowAssigneeOption = {
  readonly id: string;
  readonly label: string;
  readonly member: CrmTeamMemberRef | null;
};

function selfAssigneeMember(currentUserId: string, email: string | undefined): CrmTeamMemberRef {
  const label = content.projectDetail.edit.assigneeSelf;
  return {
    id: currentUserId,
    displayName: label,
    initials: email ? getUserInitials(email) : label.slice(0, 2).toUpperCase(),
    avatarUrl: null,
    email: email ?? null,
  };
}

export function getWorkflowTaskAssigneeOptions(
  isApiSource: boolean,
  currentUserId: string | undefined,
  currentUserEmail?: string
): readonly WorkflowAssigneeOption[] {
  const unassigned: WorkflowAssigneeOption = {
    id: '',
    label: content.projectDetail.edit.assigneeUnassigned,
    member: null,
  };

  if (isApiSource) {
    if (!currentUserId) return [unassigned];
    return [
      unassigned,
      {
        id: currentUserId,
        label: content.projectDetail.edit.assigneeSelf,
        member: selfAssigneeMember(currentUserId, currentUserEmail),
      },
    ];
  }

  return [
    unassigned,
    ...MOCK_CRM_TEAM_MEMBERS.map((member) => ({
      id: member.id,
      label: member.displayName,
      member,
    })),
  ];
}
