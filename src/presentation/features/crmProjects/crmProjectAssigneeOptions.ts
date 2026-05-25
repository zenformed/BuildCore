import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildAssigneeOptions, type AssigneeOption } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';

export type CrmProjectAssigneeOption = AssigneeOption;

/** Team members only — project-level assignment never includes the customer contact. */
export function getCrmProjectAssigneeOptions(
  isApiSource: boolean,
  catalog: AssignmentIdentityCatalog | null,
  currentUserId?: string | null
): readonly CrmProjectAssigneeOption[] {
  return buildAssigneeOptions({
    isApiSource,
    unassignedLabel: content.crm.create.assigneeUnassigned,
    selfLabel: content.crm.assignee.self,
    currentUserId,
    catalog,
  });
}
