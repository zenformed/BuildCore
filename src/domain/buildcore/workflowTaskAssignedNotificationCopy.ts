/**
 * Plain-text copy for workflow_task.assigned in-app notifications.
 */

export const WORKFLOW_TASK_ASSIGNED_NOTIFICATION_TITLE = 'Workflow task assigned';

export function buildWorkflowTaskAssignedNotificationBody(input: {
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
    return `${actor} assigned you to ${task} in ${sub} of ${project}.`;
  }
  return `${actor} assigned you to ${task} in ${project}.`;
}

export function buildWorkflowTaskAssignedDestinationPath(input: {
  readonly parentRouteSlug: string;
  readonly subSlug: string | null;
}): string {
  const parent = encodeURIComponent(input.parentRouteSlug);
  if (input.subSlug) {
    return `/projects/${parent}/${encodeURIComponent(input.subSlug)}/tasks`;
  }
  return `/projects/${parent}/tasks`;
}
