import type { CrmWorkflowTask } from '@/domain/crm';
import { isCrmProjectComplete, type CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectStageCompletion } from '@/domain/crm/projectStageCompletion';
import { isWorkflowStageComplete, resolveWorkflowStageCompletionState } from '@/domain/crm/projectStageCompletion';
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

export type WorkflowStageCompletionInput = {
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly stages?: readonly PipelineStage[] | null;
  readonly manualStageCompletions?: readonly CrmProjectStageCompletion[] | null;
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

function resolveManualStageCompletions(
  manualStageCompletions?: readonly CrmProjectStageCompletion[] | null
): readonly CrmProjectStageCompletion[] {
  return manualStageCompletions ?? [];
}

export function listWorkflowStageCompletionStatuses(
  input: WorkflowStageCompletionInput
): readonly WorkflowStageCompletionStatus[] {
  const { workflowTasks, stages, manualStageCompletions } = input;
  const manualCompletions = resolveManualStageCompletions(manualStageCompletions);
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
    const completion = resolveWorkflowStageCompletionState({
      stageSlug: stage.slug,
      tasks: stageTasks,
      manualCompletions,
    });

    return {
      stageSlug: stage.slug,
      stageLabel: stage.label,
      isComplete: completion.isComplete,
      taskCount: completion.taskCount,
      percentComplete: completion.percentComplete,
    };
  });
}

export function listIncompleteWorkflowStages(
  input: WorkflowStageCompletionInput
): readonly IncompleteWorkflowStage[] {
  return listWorkflowStageCompletionStatuses(input)
    .filter((stage) => !stage.isComplete)
    .map(({ stageSlug, stageLabel }) => ({ stageSlug, stageLabel }));
}

export function canMarkProjectCompleteByWorkflowTasks(
  input: WorkflowStageCompletionInput
): boolean {
  return listIncompleteWorkflowStages(input).length === 0;
}

export function countCompletedWorkflowStages(
  input: WorkflowStageCompletionInput
): { readonly completedStageCount: number; readonly totalActiveStageCount: number } {
  const { workflowTasks, stages, manualStageCompletions } = input;
  const manualCompletions = resolveManualStageCompletions(manualStageCompletions);
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
    if (
      isWorkflowStageComplete({
        stageSlug: stage.slug,
        tasks: tasksByStage.get(stage.slug) ?? [],
        manualCompletions,
      })
    ) {
      completedStageCount += 1;
    }
  }

  return { completedStageCount, totalActiveStageCount };
}

export function computeWorkflowStageBasedProjectProgressPercent(
  input: WorkflowStageCompletionInput
): number {
  const { completedStageCount, totalActiveStageCount } = countCompletedWorkflowStages(input);
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
  readonly manualStageCompletions?: readonly CrmProjectStageCompletion[] | null;
  readonly isComplete?: boolean;
  readonly stages?: readonly PipelineStage[] | null;
}): ProjectProgressDisplay {
  if (input.isComplete) {
    return {
      textPercent: 100,
      litSegmentCount: progressLitSegmentCount(100),
    };
  }

  const rawPercent = computeWorkflowStageBasedProjectProgressPercent({
    workflowTasks: input.workflowTasks,
    stages: input.stages,
    manualStageCompletions: input.manualStageCompletions,
  });
  const textPercent = Math.round(rawPercent);

  return {
    textPercent,
    litSegmentCount: progressLitSegmentCount(textPercent),
  };
}
