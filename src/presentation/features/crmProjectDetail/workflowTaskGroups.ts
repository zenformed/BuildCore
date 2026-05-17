import { DEFAULT_PIPELINE_STAGES, type CrmWorkflowTask, type PipelineStageSlug } from '@/domain/crm';
import { sortWorkflowTasksForDisplay } from './workflowTaskSort';

export type WorkflowTaskStageGroup = {
  readonly stageSlug: PipelineStageSlug;
  readonly stageLabel: string;
  readonly tasks: readonly CrmWorkflowTask[];
};

/** Group workflow tasks by pipeline stage (pipeline order); omit empty stages. */
export function groupWorkflowTasksByStage(
  tasks: readonly CrmWorkflowTask[],
  currentStageSlug: PipelineStageSlug
): WorkflowTaskStageGroup[] {
  const sorted = sortWorkflowTasksForDisplay(tasks, currentStageSlug);
  const byStage = new Map<PipelineStageSlug, CrmWorkflowTask[]>();

  for (const task of sorted) {
    const list = byStage.get(task.stageSlug) ?? [];
    list.push(task);
    byStage.set(task.stageSlug, list);
  }

  return DEFAULT_PIPELINE_STAGES.filter((stage) => byStage.has(stage.slug)).map((stage) => ({
    stageSlug: stage.slug,
    stageLabel: stage.label,
    tasks: byStage.get(stage.slug) ?? [],
  }));
}
