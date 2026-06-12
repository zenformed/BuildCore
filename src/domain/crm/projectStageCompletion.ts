import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';
import type { CrmWorkflowTask } from './workflowTask';
import { isWorkflowStageCompleteByTasks } from '@/domain/buildcore/projectPipelineProgress';

export type CrmProjectStageCompletionSource = 'manual';

export type CrmProjectStageCompletion = {
  readonly stageSlug: PipelineStageSlug;
  readonly completedAt: string;
  readonly completedBy: CrmTeamMemberRef | null;
  readonly source: CrmProjectStageCompletionSource;
};

export function isStageManuallyCompleted(
  stageSlug: PipelineStageSlug,
  manualCompletions: readonly Pick<CrmProjectStageCompletion, 'stageSlug'>[]
): boolean {
  return manualCompletions.some((completion) => completion.stageSlug === stageSlug);
}

export function resolveWorkflowStageCompletionState(input: {
  readonly stageSlug: PipelineStageSlug;
  readonly tasks: readonly CrmWorkflowTask[];
  readonly manualCompletions: readonly Pick<CrmProjectStageCompletion, 'stageSlug'>[];
}): {
  readonly isComplete: boolean;
  readonly taskCount: number;
  readonly percentComplete: number;
} {
  const taskCount = input.tasks.length;
  if (taskCount > 0) {
    const doneCount = input.tasks.filter((task) => task.status === 'done').length;
    return {
      isComplete: isWorkflowStageCompleteByTasks(input.tasks),
      taskCount,
      percentComplete: (doneCount / taskCount) * 100,
    };
  }

  const manual = isStageManuallyCompleted(input.stageSlug, input.manualCompletions);
  return {
    isComplete: manual,
    taskCount: 0,
    percentComplete: manual ? 100 : 0,
  };
}

export function isWorkflowStageComplete(input: {
  readonly stageSlug: PipelineStageSlug;
  readonly tasks: readonly CrmWorkflowTask[];
  readonly manualCompletions: readonly Pick<CrmProjectStageCompletion, 'stageSlug'>[];
}): boolean {
  return resolveWorkflowStageCompletionState(input).isComplete;
}
