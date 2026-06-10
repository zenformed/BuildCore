import type { CrmWorkflowTask, PipelineStage, PipelineStageSlug, WorkflowTaskStatus } from '@/domain/crm';

const STATUS_ORDER: Record<WorkflowTaskStatus, number> = {
  in_progress: 0,
  blocked: 1,
  request_review: 2,
  pending: 3,
  done: 4,
  skipped: 5,
};

export function sortWorkflowTasksForDisplay(
  tasks: readonly CrmWorkflowTask[],
  currentStageSlug: PipelineStageSlug,
  _stages?: readonly PipelineStage[] | null
): CrmWorkflowTask[] {
  return [...tasks].sort((a, b) => {
    const stageA = a.stageSlug === currentStageSlug ? 0 : 1;
    const stageB = b.stageSlug === currentStageSlug ? 0 : 1;
    if (stageA !== stageB) return stageA - stageB;

    const statusA = STATUS_ORDER[a.status];
    const statusB = STATUS_ORDER[b.status];
    if (statusA !== statusB) return statusA - statusB;

    return a.sortOrder - b.sortOrder;
  });
}
