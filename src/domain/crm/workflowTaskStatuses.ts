import type { WorkflowTaskStatus } from './workflowTask';

export const WORKFLOW_TASK_STATUSES: readonly WorkflowTaskStatus[] = [
  'pending',
  'in_progress',
  'blocked',
  'skipped',
  'request_review',
  'done',
] as const;

export const WORKFLOW_TASK_STATUS_LABELS: Record<WorkflowTaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  skipped: 'Skipped',
  request_review: 'Needs Approval',
  done: 'Done',
};

export function isWorkflowTaskStatus(value: string): value is WorkflowTaskStatus {
  return (WORKFLOW_TASK_STATUSES as readonly string[]).includes(value);
}
