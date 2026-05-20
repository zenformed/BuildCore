import type { CrmTeamMemberRef } from '@/domain/crm';
import { getUserInitials } from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';

export type CrmProjectAssigneeOption = {
  readonly id: string;
  readonly label: string;
  readonly member: CrmTeamMemberRef | null;
};

export function getCrmProjectAssigneeOptions(
  isApiSource: boolean,
  currentUserId: string | undefined,
  currentUserEmail?: string
): readonly CrmProjectAssigneeOption[] {
  const create = content.crm.create;
  const unassigned: CrmProjectAssigneeOption = {
    id: '',
    label: create.assigneeUnassigned,
    member: null,
  };

  if (isApiSource) {
    if (!currentUserId) return [unassigned];
    const label = create.assigneeSelf;
    return [
      unassigned,
      {
        id: currentUserId,
        label,
        member: {
          id: currentUserId,
          displayName: label,
          initials: currentUserEmail ? getUserInitials(currentUserEmail) : label.slice(0, 2).toUpperCase(),
          avatarUrl: null,
          email: currentUserEmail ?? null,
        },
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
