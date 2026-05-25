import type { CrmContact } from '@/domain/crm';
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
