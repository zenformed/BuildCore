import type { WorkflowTaskStatus } from '@/domain/crm';

export function didEnterWorkflowTaskStatus(
  previousStatus: WorkflowTaskStatus | null,
  nextStatus: WorkflowTaskStatus,
  targetStatus: WorkflowTaskStatus
): boolean {
  return (
    previousStatus != null &&
    previousStatus !== targetStatus &&
    nextStatus === targetStatus
  );
}
