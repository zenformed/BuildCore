/** Synthetic member id for workflow tasks assigned to the project customer contact. */
export const WORKFLOW_TASK_CONTACT_ASSIGNEE_PREFIX = 'crm-contact:';

export function isWorkflowTaskContactAssigneeId(memberId: string): boolean {
  return memberId.startsWith(WORKFLOW_TASK_CONTACT_ASSIGNEE_PREFIX);
}

export function contactIdFromWorkflowTaskAssigneeId(memberId: string): string | null {
  if (!isWorkflowTaskContactAssigneeId(memberId)) return null;
  const contactId = memberId.slice(WORKFLOW_TASK_CONTACT_ASSIGNEE_PREFIX.length).trim();
  return contactId.length > 0 ? contactId : null;
}

export function workflowTaskAssigneeIdFromContactId(contactId: string): string {
  return `${WORKFLOW_TASK_CONTACT_ASSIGNEE_PREFIX}${contactId}`;
}
