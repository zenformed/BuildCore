import type {
  CrmProjectStageCompletion,
  CrmWorkflowTask,
  PipelineStage,
} from '@/domain/crm';
import {
  areAllWorkflowStagesComplete,
  listEmptyIncompleteWorkflowStages,
} from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export type WorkflowTasksBatchCompleteState = {
  readonly canClick: boolean;
  readonly title: string;
  readonly allComplete: boolean;
};

export function resolveWorkflowTasksBatchCompleteState(input: {
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly manualStageCompletions: readonly CrmProjectStageCompletion[];
  readonly stages: readonly PipelineStage[];
  readonly disabled?: boolean;
  readonly busy?: boolean;
}): WorkflowTasksBatchCompleteState {
  const wf = content.projectDetail.workflow;
  const completionInput = {
    workflowTasks: input.workflowTasks,
    manualStageCompletions: input.manualStageCompletions,
    stages: input.stages,
  };
  const allComplete = areAllWorkflowStagesComplete(completionInput);
  const emptyIncompleteStages = listEmptyIncompleteWorkflowStages(completionInput);
  const canClick =
    !allComplete &&
    emptyIncompleteStages.length > 0 &&
    !input.disabled &&
    !input.busy;
  const title = allComplete
    ? wf.markAllEmptyStagesCompleteAllDone
    : emptyIncompleteStages.length === 0
      ? wf.markAllEmptyStagesCompleteNone
      : wf.markAllEmptyStagesCompleteAction;
  return { canClick, title, allComplete };
}
