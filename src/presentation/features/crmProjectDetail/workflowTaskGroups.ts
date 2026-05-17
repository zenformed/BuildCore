import { DEFAULT_PIPELINE_STAGES, type CrmWorkflowTask, type PipelineStageSlug } from '@/domain/crm';
import { sortWorkflowTasksForDisplay } from './workflowTaskSort';

export type WorkflowTaskStageGroup = {
  readonly stageSlug: PipelineStageSlug;
  readonly stageLabel: string;
  readonly tasks: readonly CrmWorkflowTask[];
};

export const WORKFLOW_TASKS_PREVIEW_LIMIT = 4;

/** First `maxTasks` tasks across stage groups (pipeline order), preserving group structure. */
export function limitWorkflowTaskGroups(
  groups: readonly WorkflowTaskStageGroup[],
  maxTasks: number
): WorkflowTaskStageGroup[] {
  if (maxTasks <= 0) return [];
  let remaining = maxTasks;
  const result: WorkflowTaskStageGroup[] = [];
  for (const group of groups) {
    if (remaining <= 0) break;
    if (group.tasks.length <= remaining) {
      result.push(group);
      remaining -= group.tasks.length;
    } else {
      result.push({
        stageSlug: group.stageSlug,
        stageLabel: group.stageLabel,
        tasks: group.tasks.slice(0, remaining),
      });
      remaining = 0;
    }
  }
  return result;
}

export function countWorkflowTasksInGroups(groups: readonly WorkflowTaskStageGroup[]): number {
  return groups.reduce((total, group) => total + group.tasks.length, 0);
}

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
