import type { CrmContact } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildAssigneeOptions, type AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';

export type WorkflowAssigneeOption = AssigneeOption;

export function getWorkflowTaskAssigneeOptions(
  isApiSource: boolean,
  catalog: AssignmentIdentityCatalog | null,
  projectContact?: CrmContact | null,
  currentUserId?: string | null
): readonly WorkflowAssigneeOption[] {
  return buildAssigneeOptions({
    isApiSource,
    unassignedLabel: content.projectDetail.edit.assigneeUnassigned,
    selfLabel: content.crm.assignee.self,
    currentUserId,
    catalog,
    includeCustomerOption: true,
    projectContact,
  });
}
