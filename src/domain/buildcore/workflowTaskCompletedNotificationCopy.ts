/**
 * Plain-text copy for workflow_task.completed in-app notifications.
 */

export const WORKFLOW_TASK_COMPLETED_NOTIFICATION_TITLE = 'Task completed';

export function buildWorkflowTaskCompletedNotificationBody(input: {
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
    return `${actor} marked ${task} as done in ${sub} of ${project}.`;
  }
  return `${actor} marked ${task} as done in ${project}.`;
}
