/**
 * Detect whether a workflow-task Rejected transition should produce
 * workflow_task.rejected in-app notifications.
 * Only org-member assignees are eligible — not customer contacts.
 */

export type WorkflowTaskRejectedChange = {
  readonly recipientUserId: string | null;
  readonly actorUserId: string;
};

export function shouldNotifyWorkflowTaskRejected(
  change: WorkflowTaskRejectedChange
): boolean {
  const recipient = change.recipientUserId?.trim() || null;
  const actor = change.actorUserId.trim();
  if (!recipient) return false;
  if (!actor) return false;
  if (recipient === actor) return false;
  return true;
}

export function buildWorkflowTaskRejectedIdempotencyKey(input: {
  readonly taskId: string;
  readonly recipientUserId: string;
  readonly previousStatus: string;
  readonly nextStatus: string;
}): string {
  return `workflow-task-rejected:${input.taskId}:${input.recipientUserId}:${input.previousStatus}->${input.nextStatus}`;
}
