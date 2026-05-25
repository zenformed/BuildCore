import type { CrmContact } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildAssigneeOptions, type AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';

export type CrmProjectAssigneeOption = AssigneeOption;

export function getCrmProjectAssigneeOptions(
  isApiSource: boolean,
  catalog: AssignmentIdentityCatalog | null,
  projectContact?: CrmContact | null,
  currentUserId?: string | null
): readonly CrmProjectAssigneeOption[] {
  return buildAssigneeOptions({
    isApiSource,
    unassignedLabel: content.crm.create.assigneeUnassigned,
    selfLabel: content.crm.assignee.self,
    currentUserId,
    catalog,
    projectContact,
  });
}
