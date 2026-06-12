import type { CrmWorkflowTask } from '@/domain/crm';
import { isCrmProjectComplete, type CrmProjectSummary } from '@/domain/crm';
import { isPaymentWorkflowTask, PAYMENT_WORKFLOW_STAGE_SLUG } from '@/domain/crm/paymentWorkflow';
import type { PipelineStage, PipelineStageSlug } from '@/domain/crm/pipelineStage';
import { resolvePipelineStageCatalog } from '@/domain/crm/pipelineStage';
import { isReservedPipelineStageSlug } from '@/domain/buildcore/orgPipelineStages';

export const PROJECT_PROGRESS_SEGMENT_COUNT = 20;
export const PROJECT_PROGRESS_SEGMENT_STEP = 5;

export type ProjectProgressDisplay = {
  readonly textPercent: number;
  readonly litSegmentCount: number;
};

/** Active org workflow stages used for project progress (excludes payments + reserved terminal). */
export function resolveActiveWorkflowPipelineStages(
  stages?: readonly PipelineStage[] | null
): readonly PipelineStage[] {
  return resolvePipelineStageCatalog(stages).filter(
    (stage) =>
      stage.slug !== PAYMENT_WORKFLOW_STAGE_SLUG && !isReservedPipelineStageSlug(stage.slug)
  );
}

export function isWorkflowStageCompleteByTasks(tasks: readonly CrmWorkflowTask[]): boolean {
  return tasks.length > 0 && tasks.every((task) => task.status === 'done');
}

export type IncompleteWorkflowStage = {
  readonly stageSlug: PipelineStageSlug;
  readonly stageLabel: string;
};

export type WorkflowStageCompletionStatus = IncompleteWorkflowStage & {
  readonly isComplete: boolean;
  readonly taskCount: number;
  readonly percentComplete: number;
};

export function listWorkflowStageCompletionStatuses(
  workflowTasks: readonly CrmWorkflowTask[],
  stages?: readonly PipelineStage[] | null
): readonly WorkflowStageCompletionStatus[] {
  const activeStages = resolveActiveWorkflowPipelineStages(stages);
  const opsTasks = workflowTasks.filter((task) => !isPaymentWorkflowTask(task));
  const tasksByStage = new Map<PipelineStageSlug, CrmWorkflowTask[]>();

  for (const task of opsTasks) {
    const stageTasks = tasksByStage.get(task.stageSlug) ?? [];
    stageTasks.push(task);
    tasksByStage.set(task.stageSlug, stageTasks);
  }

  return activeStages.map((stage) => {
    const stageTasks = tasksByStage.get(stage.slug) ?? [];
    const taskCount = stageTasks.length;
    const doneCount = stageTasks.filter((task) => task.status === 'done').length;
    const percentComplete = taskCount === 0 ? 0 : (doneCount / taskCount) * 100;

    return {
      stageSlug: stage.slug,
      stageLabel: stage.label,
      isComplete: isWorkflowStageCompleteByTasks(stageTasks),
      taskCount,
      percentComplete,
    };
  });
}

export function listIncompleteWorkflowStages(
  workflowTasks: readonly CrmWorkflowTask[],
  stages?: readonly PipelineStage[] | null
): readonly IncompleteWorkflowStage[] {
  return listWorkflowStageCompletionStatuses(workflowTasks, stages)
    .filter((stage) => !stage.isComplete)
    .map(({ stageSlug, stageLabel }) => ({ stageSlug, stageLabel }));
}

export function canMarkProjectCompleteByWorkflowTasks(
  workflowTasks: readonly CrmWorkflowTask[],
  stages?: readonly PipelineStage[] | null
): boolean {
  return listIncompleteWorkflowStages(workflowTasks, stages).length === 0;
}

export function countCompletedWorkflowStages(
  workflowTasks: readonly CrmWorkflowTask[],
  stages?: readonly PipelineStage[] | null
): { readonly completedStageCount: number; readonly totalActiveStageCount: number } {
  const activeStages = resolveActiveWorkflowPipelineStages(stages);
  const totalActiveStageCount = activeStages.length;
  if (totalActiveStageCount === 0) {
    return { completedStageCount: 0, totalActiveStageCount: 0 };
  }

  const opsTasks = workflowTasks.filter((task) => !isPaymentWorkflowTask(task));
  const tasksByStage = new Map<PipelineStageSlug, CrmWorkflowTask[]>();

  for (const task of opsTasks) {
    const stageTasks = tasksByStage.get(task.stageSlug) ?? [];
    stageTasks.push(task);
    tasksByStage.set(task.stageSlug, stageTasks);
  }

  let completedStageCount = 0;
  for (const stage of activeStages) {
    if (isWorkflowStageCompleteByTasks(tasksByStage.get(stage.slug) ?? [])) {
      completedStageCount += 1;
    }
  }

  return { completedStageCount, totalActiveStageCount };
}

export function computeWorkflowStageBasedProjectProgressPercent(
  workflowTasks: readonly CrmWorkflowTask[],
  stages?: readonly PipelineStage[] | null
): number {
  const { completedStageCount, totalActiveStageCount } = countCompletedWorkflowStages(
    workflowTasks,
    stages
  );
  if (totalActiveStageCount === 0) return 0;
  return (completedStageCount / totalActiveStageCount) * 100;
}

export function pipelineStageProgressPercent(
  stageSlug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): number {
  const catalog = resolvePipelineStageCatalog(stages);
  const sorted = [...catalog].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = sorted.findIndex((stage) => stage.slug === stageSlug);
  if (index < 0) return 0;
  if (sorted.length <= 1) return 100;
  return Math.round((index / (sorted.length - 1)) * 100);
}

export function roundProgressToNearestFive(percent: number): number {
  return Math.round(percent / PROJECT_PROGRESS_SEGMENT_STEP) * PROJECT_PROGRESS_SEGMENT_STEP;
}

export function progressLitSegmentCount(percent: number): number {
  const rounded = roundProgressToNearestFive(percent);
  return Math.min(
    PROJECT_PROGRESS_SEGMENT_COUNT,
    Math.max(0, rounded / PROJECT_PROGRESS_SEGMENT_STEP)
  );
}

export function averagePipelineProgressPercents(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

/** Dashboard/list rows — still position-based until summaries include workflow tasks. */
export function resolveProjectSummaryProgressDisplay(
  summary: Pick<CrmProjectSummary, 'currentStageSlug' | 'completedAt'>,
  stages?: readonly PipelineStage[] | null
): ProjectProgressDisplay {
  if (isCrmProjectComplete(summary)) {
    return {
      textPercent: 100,
      litSegmentCount: progressLitSegmentCount(100),
    };
  }
  const textPercent = pipelineStageProgressPercent(summary.currentStageSlug, stages);
  return {
    textPercent,
    litSegmentCount: progressLitSegmentCount(textPercent),
  };
}

export function resolveProjectDetailProgressDisplay(input: {
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly isComplete?: boolean;
  readonly stages?: readonly PipelineStage[] | null;
}): ProjectProgressDisplay {
  if (input.isComplete) {
    return {
      textPercent: 100,
      litSegmentCount: progressLitSegmentCount(100),
    };
  }

  const rawPercent = computeWorkflowStageBasedProjectProgressPercent(
    input.workflowTasks,
    input.stages
  );
  const textPercent = Math.round(rawPercent);

  return {
    textPercent,
    litSegmentCount: progressLitSegmentCount(textPercent),
  };
}
