import type { PipelineStageSlug } from './pipelineStage';
import type { CrmWorkflowTask, WorkflowTaskStatus } from './workflowTask';
import { isWorkflowTaskStatus } from './workflowTaskStatuses';
import type { CrmProjectStageCompletion } from './projectStageCompletion';

export type CrmProjectWorkflowProgressTask = {
  readonly stageSlug: PipelineStageSlug;
  readonly status: WorkflowTaskStatus;
  readonly amountCents: number | null;
};

export type CrmProjectWorkflowProgressInput = {
  readonly tasks: readonly CrmProjectWorkflowProgressTask[];
  readonly manualStageCompletionSlugs: readonly PipelineStageSlug[];
};

export type CrmProjectWorkflowProgressInputIndex = ReadonlyMap<
  string,
  CrmProjectWorkflowProgressInput
>;

export type SerializedCrmProjectWorkflowProgressInput = {
  readonly tasks: readonly {
    readonly stageSlug: string;
    readonly status: string;
    readonly amountCents: number | null;
  }[];
  readonly manualStageCompletionSlugs: readonly string[];
};

const EMPTY_WORKFLOW_PROGRESS_INPUT: CrmProjectWorkflowProgressInput = {
  tasks: [],
  manualStageCompletionSlugs: [],
};

export function getWorkflowProgressInputForProject(
  index: CrmProjectWorkflowProgressInputIndex,
  projectId: string
): CrmProjectWorkflowProgressInput {
  return index.get(projectId) ?? EMPTY_WORKFLOW_PROGRESS_INPUT;
}

function toPipelineStageSlug(slug: string): PipelineStageSlug {
  return slug as PipelineStageSlug;
}

export function deserializeWorkflowProgressInput(
  raw: SerializedCrmProjectWorkflowProgressInput
): CrmProjectWorkflowProgressInput {
  const tasks: CrmProjectWorkflowProgressTask[] = [];
  for (const task of raw.tasks) {
    if (!isWorkflowTaskStatus(task.status)) continue;
    tasks.push({
      stageSlug: toPipelineStageSlug(task.stageSlug),
      status: task.status,
      amountCents: task.amountCents,
    });
  }

  return {
    tasks,
    manualStageCompletionSlugs: raw.manualStageCompletionSlugs.map(toPipelineStageSlug),
  };
}

export function deserializeWorkflowProgressInputIndex(
  byProjectId: Readonly<Record<string, SerializedCrmProjectWorkflowProgressInput>>
): CrmProjectWorkflowProgressInputIndex {
  return new Map(
    Object.entries(byProjectId).map(([projectId, raw]) => [
      projectId,
      deserializeWorkflowProgressInput(raw),
    ])
  );
}

export function serializeWorkflowProgressInputIndex(
  index: CrmProjectWorkflowProgressInputIndex
): Record<string, SerializedCrmProjectWorkflowProgressInput> {
  return Object.fromEntries(
    [...index.entries()].map(([projectId, input]) => [
      projectId,
      {
        tasks: input.tasks.map((task) => ({
          stageSlug: task.stageSlug,
          status: task.status,
          amountCents: task.amountCents,
        })),
        manualStageCompletionSlugs: [...input.manualStageCompletionSlugs],
      },
    ])
  );
}

function toProgressWorkflowTask(
  task: CrmProjectWorkflowProgressTask,
  index: number
): CrmWorkflowTask {
  return {
    id: `workflow-progress-${index}`,
    stageSlug: task.stageSlug,
    status: task.status,
    amountCents: task.amountCents,
    title: '',
    documentsRequired: false,
    notes: null,
    assignedTo: null,
    dueAt: null,
    completedAt: null,
    completedBy: null,
    sortOrder: index,
    invoicedAt: null,
    paidAt: null,
    customFields: {},
  };
}

export function workflowProgressInputToWorkflowTasks(
  input: CrmProjectWorkflowProgressInput
): readonly CrmWorkflowTask[] {
  return input.tasks.map(toProgressWorkflowTask);
}

export function workflowProgressInputToManualStageCompletions(
  input: CrmProjectWorkflowProgressInput
): readonly CrmProjectStageCompletion[] {
  return input.manualStageCompletionSlugs.map((stageSlug) => ({
    stageSlug,
    completedAt: '',
    completedBy: null,
    source: 'manual' as const,
  }));
}
