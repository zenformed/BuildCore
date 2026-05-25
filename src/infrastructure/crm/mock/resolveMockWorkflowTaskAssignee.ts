import type { CrmContact, CrmProjectDetail, CrmTeamMemberRef } from '@/domain/crm';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';
import { teamMemberRefFromContact } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { getMockCrmTeamMember } from '@/platform/mock/crm';

export function resolveMockWorkflowTaskAssignee(
  assignedMemberId: string | null,
  projectContact: CrmContact
): CrmTeamMemberRef | null {
  if (assignedMemberId == null || assignedMemberId === '') return null;
  if (isWorkflowTaskContactAssigneeId(assignedMemberId)) {
    return teamMemberRefFromContact(projectContact);
  }
  return getMockCrmTeamMember(assignedMemberId);
}

export function resolveMockWorkflowTaskAssigneeFromDetail(
  assignedMemberId: string | null,
  detail: CrmProjectDetail
): CrmTeamMemberRef | null {
  return resolveMockWorkflowTaskAssignee(assignedMemberId, detail.summary.contact);
}
