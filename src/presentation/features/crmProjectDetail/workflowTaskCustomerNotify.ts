import type { CrmContact, CrmWorkflowTask } from '@/domain/crm';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';

export type WorkflowTaskCustomerNotifyPrompt = {
  readonly taskId: string;
  readonly customerName: string;
  readonly customerEmail: string | null;
};

export function shouldOfferWorkflowTaskCustomerNotify(input: {
  readonly isApiSource: boolean;
  readonly previousAssigneeId: string | null | undefined;
  readonly newAssigneeId: string;
}): boolean {
  if (!input.isApiSource) return false;
  const next = input.newAssigneeId.trim();
  if (!isWorkflowTaskContactAssigneeId(next)) return false;
  const previous = input.previousAssigneeId?.trim() ?? '';
  return previous !== next;
}

/** Whether a task can use the manual “Send customer notification” row action. */
export function taskSupportsManualWorkflowTaskCustomerNotification(
  task: Pick<CrmWorkflowTask, 'assignedTo' | 'documentsRequired' | 'status'>,
  isApiSource: boolean
): boolean {
  if (!isApiSource) return false;
  const assigneeId = task.assignedTo?.id ?? '';
  if (isWorkflowTaskContactAssigneeId(assigneeId)) return true;
  if (task.documentsRequired) return true;
  if (task.status === 'request_review') return true;
  return false;
}

export function workflowTaskCustomerNotifyPromptFromContact(
  taskId: string,
  contact: CrmContact
): WorkflowTaskCustomerNotifyPrompt {
  const email = contact.email.trim();
  const customerName = contact.name.trim() || 'Customer';
  return {
    taskId,
    customerName,
    customerEmail: email.length > 0 ? email : null,
  };
}
