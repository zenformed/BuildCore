import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';
import type { CrmWorkflowTask } from './workflowTask';
import {
  isWorkflowStageCompleteByTasks,
  isWorkflowTaskComplete,
  listWorkflowStageCompletionStatuses,
  type WorkflowStageCompletionInput,
} from '@/domain/buildcore/projectPipelineProgress';

export type CrmProjectStageCompletionSource = 'manual';

/**
 * Stored manual stage completion row (legacy).
 * No longer the source of truth for stage visual completion — kept for history/audit until a later cleanup.
 */
export type CrmProjectStageCompletion = {
  readonly stageSlug: PipelineStageSlug;
  readonly completedAt: string;
  readonly completedBy: CrmTeamMemberRef | null;
  readonly source: CrmProjectStageCompletionSource;
};

/** @deprecated Manual stage completion is no longer used for derived stage completion. */
export function isStageManuallyCompleted(
  stageSlug: PipelineStageSlug,
  manualCompletions: readonly Pick<CrmProjectStageCompletion, 'stageSlug'>[]
): boolean {
  return manualCompletions.some((completion) => completion.stageSlug === stageSlug);
}

/**
 * Derived stage completion from task state only.
 * Complete when the stage has ≥1 task and every task is complete (shared task rule).
 * Empty stages are never complete and do not use stored manual completions.
 */
export function resolveWorkflowStageCompletionState(input: {
  readonly stageSlug: PipelineStageSlug;
  readonly tasks: readonly CrmWorkflowTask[];
  /** @deprecated Ignored — retained for call-site compatibility. */
  readonly manualCompletions?: readonly Pick<CrmProjectStageCompletion, 'stageSlug'>[];
}): {
  readonly isComplete: boolean;
  readonly taskCount: number;
  readonly percentComplete: number;
} {
  const taskCount = input.tasks.length;
  if (taskCount === 0) {
    return {
      isComplete: false,
      taskCount: 0,
      percentComplete: 0,
    };
  }
  const doneCount = input.tasks.filter((task) => isWorkflowTaskComplete(task)).length;
  return {
    isComplete: isWorkflowStageCompleteByTasks(input.tasks),
    taskCount,
    percentComplete: (doneCount / taskCount) * 100,
  };
}

export function isWorkflowStageComplete(input: {
  readonly stageSlug: PipelineStageSlug;
  readonly tasks: readonly CrmWorkflowTask[];
  readonly manualCompletions?: readonly Pick<CrmProjectStageCompletion, 'stageSlug'>[];
}): boolean {
  return resolveWorkflowStageCompletionState(input).isComplete;
}

export type EmptyIncompleteWorkflowStage = {
  readonly stageSlug: PipelineStageSlug;
  readonly stageLabel: string;
};

/** @deprecated Empty stages are ignored; always returns []. */
export function listEmptyIncompleteWorkflowStages(
  _input: WorkflowStageCompletionInput
): readonly EmptyIncompleteWorkflowStage[] {
  return [];
}

export function areAllWorkflowStagesComplete(input: WorkflowStageCompletionInput): boolean {
  const statuses = listWorkflowStageCompletionStatuses(input).filter((stage) => stage.taskCount > 0);
  return statuses.length === 0 || statuses.every((stage) => stage.isComplete);
}
