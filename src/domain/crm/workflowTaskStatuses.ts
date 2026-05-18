import type { WorkflowTaskStatus } from './workflowTask';

export const WORKFLOW_TASK_STATUSES: readonly WorkflowTaskStatus[] = [
  'pending',
  'in_progress',
  'blocked',
  'done',
  'skipped',
] as const;
