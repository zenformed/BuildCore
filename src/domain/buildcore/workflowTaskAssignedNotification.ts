/**
 * Detect whether a workflow-task assignment should produce workflow_task.assigned.
 * Only org-member assignees (auth user ids) are eligible — not customer contacts.
 */

export type WorkflowTaskAssignmentChange = {
  readonly previousAssignedMemberId: string | null;
  readonly nextAssignedMemberId: string | null;
  readonly actorUserId: string;
};

export function shouldNotifyWorkflowTaskAssigned(
  change: WorkflowTaskAssignmentChange
): boolean {
  const next = change.nextAssignedMemberId?.trim() || null;
  const previous = change.previousAssignedMemberId?.trim() || null;
  const actor = change.actorUserId.trim();
  if (!next) return false;
  if (!actor) return false;
  if (next === actor) return false; // self-assignment: no notification
  if (previous === next) return false;
  return true;
}

export function buildWorkflowTaskAssignedIdempotencyKey(input: {
  readonly taskId: string;
  readonly recipientUserId: string;
  readonly assignedAt: string;
}): string {
  return `workflow-task-assigned:${input.taskId}:${input.recipientUserId}:${input.assignedAt}`;
}
