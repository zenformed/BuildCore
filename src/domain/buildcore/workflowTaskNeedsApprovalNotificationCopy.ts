/**
 * Plain-text copy for workflow_task.needs_approval in-app notifications.
 */

export const WORKFLOW_TASK_NEEDS_APPROVAL_NOTIFICATION_TITLE = 'Task needs approval';

export function buildWorkflowTaskNeedsApprovalNotificationBody(input: {
  readonly actorDisplayName: string;
  readonly taskTitle: string;
  readonly projectName: string;
  readonly subprojectName: string | null;
}): string {
  const actor = input.actorDisplayName.trim() || 'Someone';
  const task = input.taskTitle.trim() || 'a workflow task';
  const project = input.projectName.trim() || 'a project';
  const sub = input.subprojectName?.trim() || null;

  if (sub) {
    return `${actor} submitted ${task} for approval in ${sub} of ${project}.`;
  }
  return `${actor} submitted ${task} for approval in ${project}.`;
}
