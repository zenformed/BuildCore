import type { CrmContact, CrmWorkflowTask } from '@/domain/crm';
import { isWorkflowTaskContactAssigneeId } from '@/domain/crm/workflowTaskAssignee';

export type WorkflowTaskAssignedNotifyKind = 'customer' | 'member';

export type WorkflowTaskAssignedNotifyPrompt = {
  readonly taskId: string;
  readonly kind: WorkflowTaskAssignedNotifyKind;
  readonly recipientName: string;
  readonly recipientEmail: string | null;
};

/** @deprecated Use WorkflowTaskAssignedNotifyPrompt */
export type WorkflowTaskCustomerNotifyPrompt = WorkflowTaskAssignedNotifyPrompt;

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

export function resolveWorkflowTaskAssignedNotifyKind(
  task: Pick<CrmWorkflowTask, 'assignedTo'>
): WorkflowTaskAssignedNotifyKind | null {
  const assigneeId = task.assignedTo?.id?.trim() ?? '';
  if (!assigneeId) return null;
  if (isWorkflowTaskContactAssigneeId(assigneeId)) return 'customer';
  return 'member';
}

export function taskSupportsManualWorkflowTaskAssignedNotification(
  task: Pick<CrmWorkflowTask, 'assignedTo'>,
  isApiSource: boolean
): boolean {
  if (!isApiSource) return false;
  return resolveWorkflowTaskAssignedNotifyKind(task) != null;
}

/** @deprecated Use taskSupportsManualWorkflowTaskAssignedNotification */
export function taskSupportsManualWorkflowTaskCustomerNotification(
  task: Pick<CrmWorkflowTask, 'assignedTo' | 'documentsRequired' | 'status'>,
  isApiSource: boolean
): boolean {
  return taskSupportsManualWorkflowTaskAssignedNotification(task, isApiSource);
}

export function workflowTaskAssignedNotifyPromptFromTask(
  task: CrmWorkflowTask,
  projectContact: CrmContact
): WorkflowTaskAssignedNotifyPrompt | null {
  const kind = resolveWorkflowTaskAssignedNotifyKind(task);
  if (kind == null) return null;

  if (kind === 'customer') {
    const email = projectContact.email.trim();
    const customerName = projectContact.name.trim() || 'Customer';
    return {
      taskId: task.id,
      kind: 'customer',
      recipientName: customerName,
      recipientEmail: email.length > 0 ? email : null,
    };
  }

  const member = task.assignedTo;
  if (member == null) return null;
  const email = member.email?.trim() ?? '';
  return {
    taskId: task.id,
    kind: 'member',
    recipientName: member.displayName.trim() || 'Team member',
    recipientEmail: email.length > 0 ? email : null,
  };
}

export function workflowTaskCustomerNotifyPromptFromContact(
  taskId: string,
  contact: CrmContact
): WorkflowTaskAssignedNotifyPrompt {
  const email = contact.email.trim();
  const customerName = contact.name.trim() || 'Customer';
  return {
    taskId,
    kind: 'customer',
    recipientName: customerName,
    recipientEmail: email.length > 0 ? email : null,
  };
}
