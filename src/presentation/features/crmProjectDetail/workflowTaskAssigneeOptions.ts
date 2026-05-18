import type { CrmTeamMemberRef } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';

export type WorkflowAssigneeOption = {
  readonly id: string;
  readonly label: string;
  readonly member: CrmTeamMemberRef | null;
};

export function getWorkflowTaskAssigneeOptions(
  isApiSource: boolean,
  currentUserId: string | undefined
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
        member: null,
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
