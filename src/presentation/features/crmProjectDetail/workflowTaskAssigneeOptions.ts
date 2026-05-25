import type { CrmContact } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { buildWorkflowTaskAssigneeOptions } from '@/presentation/features/crmAssignment/buildWorkflowTaskAssigneeOptions';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';

export type WorkflowAssigneeOption = AssigneeOption;

export function getWorkflowTaskAssigneeOptions(
  isApiSource: boolean,
  catalog: AssignmentIdentityCatalog | null,
  projectContact?: CrmContact | null,
  currentUserId?: string | null,
  currentAssigneeId?: string | null
): readonly WorkflowAssigneeOption[] {
  return buildWorkflowTaskAssigneeOptions({
    isApiSource,
    unassignedLabel: content.projectDetail.edit.assigneeUnassigned,
    customerLabel: content.crm.assignee.customer,
    selfLabel: content.crm.assignee.self,
    currentUserId,
    currentAssigneeId,
    catalog,
    projectContact,
  });
}
