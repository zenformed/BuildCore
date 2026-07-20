/**
 * Detect whether a workflow-task Done transition should produce
 * workflow_task.completed in-app notifications (no email).
 * Only org-member assignees are eligible — not customer contacts.
 */

export type WorkflowTaskCompletedChange = {
  readonly recipientUserId: string | null;
  readonly actorUserId: string;
};

export function shouldNotifyWorkflowTaskCompleted(
  change: WorkflowTaskCompletedChange
): boolean {
  const recipient = change.recipientUserId?.trim() || null;
  const actor = change.actorUserId.trim();
  if (!recipient) return false;
  if (!actor) return false;
  if (recipient === actor) return false;
  return true;
}

export function buildWorkflowTaskCompletedIdempotencyKey(input: {
  readonly taskId: string;
  readonly recipientUserId: string;
  readonly previousStatus: string;
  readonly nextStatus: string;
}): string {
  return `workflow-task-completed:${input.taskId}:${input.recipientUserId}:${input.previousStatus}->${input.nextStatus}`;
}
