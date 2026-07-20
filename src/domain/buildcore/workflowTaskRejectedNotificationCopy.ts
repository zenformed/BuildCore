/**
 * Plain-text copy for workflow_task.rejected in-app notifications.
 */

export const WORKFLOW_TASK_REJECTED_NOTIFICATION_TITLE = 'Task rejected';

export function buildWorkflowTaskRejectedNotificationBody(input: {
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
    return `${actor} rejected ${task} in ${sub} of ${project}.`;
  }
  return `${actor} rejected ${task} in ${project}.`;
}
