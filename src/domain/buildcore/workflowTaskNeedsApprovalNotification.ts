/**
 * Detect whether a workflow-task Needs Approval transition should produce
 * workflow_task.needs_approval in-app notifications.
 * Recipient is the project/subproject assignee (same as the email channel).
 */

export type WorkflowTaskNeedsApprovalChange = {
  readonly recipientUserId: string | null;
  readonly actorUserId: string;
};

export function shouldNotifyWorkflowTaskNeedsApproval(
  change: WorkflowTaskNeedsApprovalChange
): boolean {
  const recipient = change.recipientUserId?.trim() || null;
  const actor = change.actorUserId.trim();
  if (!recipient) return false;
  if (!actor) return false;
  if (recipient === actor) return false;
  return true;
}

export function buildWorkflowTaskNeedsApprovalIdempotencyKey(input: {
  readonly taskId: string;
  readonly recipientUserId: string;
  readonly previousStatus: string;
  readonly nextStatus: string;
}): string {
  return `workflow-task-needs-approval:${input.taskId}:${input.recipientUserId}:${input.previousStatus}->${input.nextStatus}`;
}
