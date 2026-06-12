import type { CrmWorkflowTask } from '@/domain/crm';

import { isCrmProjectComplete, type CrmProjectSummary } from '@/domain/crm';

import { CRM_PROJECT_COMPLETE_STAGE_SLUG } from '@/domain/crm/projectCompletion';

import type { CrmProjectStageCompletion } from '@/domain/crm/projectStageCompletion';

import {
  getWorkflowProgressInputForProject,
  workflowProgressInputToManualStageCompletions,
  workflowProgressInputToWorkflowTasks,
  type CrmProjectWorkflowProgressInput,
  type CrmProjectWorkflowProgressInputIndex,
} from '@/domain/crm/projectWorkflowProgressInput';

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

  readonly stages?: readonly PipelineStage[] | null;

}): ProjectProgressDisplay {

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



/** Summary/list rows when workflow task + manual completion rollup data is available. */

export function resolveProjectWorkflowProgressDisplay(input: {

  readonly workflowProgressInput: CrmProjectWorkflowProgressInput;

  readonly stages?: readonly PipelineStage[] | null;

}): ProjectProgressDisplay {

  return resolveProjectDetailProgressDisplay({

    workflowTasks: workflowProgressInputToWorkflowTasks(input.workflowProgressInput),

    manualStageCompletions: workflowProgressInputToManualStageCompletions(

      input.workflowProgressInput

    ),

    stages: input.stages,

  });

}



export function resolveProjectWorkflowProgressDisplayFromIndex(input: {

  readonly summary: CrmProjectSummary;

  readonly workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex;

  readonly stages?: readonly PipelineStage[] | null;

}): ProjectProgressDisplay {

  return resolveProjectWorkflowProgressDisplay({

    workflowProgressInput: getWorkflowProgressInputForProject(

      input.workflowProgressInputIndex,

      input.summary.id

    ),

    stages: input.stages,

  });

}



/** Subprojects section pill — average of each child's workflow-based progress. */

export function computeSubprojectAverageProgressPercent(input: {

  readonly childSummaries: readonly CrmProjectSummary[];

  readonly workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex;

  readonly stages?: readonly PipelineStage[] | null;

}): number | null {

  if (input.childSummaries.length === 0) {

    return null;

  }



  const rawPercents = input.childSummaries.map((child) => {

    const workflowProgressInput = getWorkflowProgressInputForProject(

      input.workflowProgressInputIndex,

      child.id

    );



    return computeWorkflowStageBasedProjectProgressPercent({

      workflowTasks: workflowProgressInputToWorkflowTasks(workflowProgressInput),

      manualStageCompletions: workflowProgressInputToManualStageCompletions(

        workflowProgressInput

      ),

      stages: input.stages,

    });

  });



  return averagePipelineProgressPercents(rawPercents);

}



export function formatSubprojectAverageProgressPercent(percent: number): string {

  if (percent === 0) {

    return '0%';

  }

  if (percent === 100) {

    return '100%';

  }

  const rounded = Math.round(percent * 10) / 10;

  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;

}



export type WorkflowPipelineGraphState = {

  readonly stageStatuses: readonly WorkflowStageCompletionStatus[];

  /** First incomplete active workflow stage; null when every stage is complete. */

  readonly derivedCurrentStageSlug: PipelineStageSlug | null;

  /** Index of the last stage in the uninterrupted completed prefix; -1 when none. */

  readonly continuousCompletedStageIndex: number;

};



export function resolveContinuousCompletedStageIndex(

  stageStatuses: readonly Pick<WorkflowStageCompletionStatus, 'isComplete'>[]

): number {

  let lastIndex = -1;

  for (let index = 0; index < stageStatuses.length; index += 1) {

    if (!stageStatuses[index]?.isComplete) break;

    lastIndex = index;

  }

  return lastIndex;

}



export function resolveDerivedCurrentWorkflowStageSlug(

  stageStatuses: readonly Pick<WorkflowStageCompletionStatus, 'stageSlug' | 'isComplete'>[]

): PipelineStageSlug | null {

  return stageStatuses.find((stage) => !stage.isComplete)?.stageSlug ?? null;

}



export function computeContinuousWorkflowPipelineConnectorProgressFraction(

  continuousCompletedStageIndex: number,

  stageCount: number

): number {

  if (stageCount <= 1 || continuousCompletedStageIndex < 0) return 0;

  return continuousCompletedStageIndex / (stageCount - 1);

}



export function computeContinuousWorkflowPipelineConnectorProgressPercent(

  continuousCompletedStageIndex: number,

  stageCount: number

): number {

  return computeContinuousWorkflowPipelineConnectorProgressFraction(

    continuousCompletedStageIndex,

    stageCount

  ) * 100;

}



export function resolveWorkflowPipelineGraphState(

  input: WorkflowStageCompletionInput

): WorkflowPipelineGraphState {

  const stageStatuses = listWorkflowStageCompletionStatuses(input);

  const continuousCompletedStageIndex = resolveContinuousCompletedStageIndex(stageStatuses);

  const derivedCurrentStageSlug = resolveDerivedCurrentWorkflowStageSlug(stageStatuses);



  return {

    stageStatuses,

    derivedCurrentStageSlug,

    continuousCompletedStageIndex,

  };

}



/** Dashboard/list stage pill — first incomplete active workflow stage, or Complete when all done. */

export function resolveDerivedWorkflowStageSlugFromProgressInput(input: {

  readonly workflowProgressInput: CrmProjectWorkflowProgressInput;

  readonly stages?: readonly PipelineStage[] | null;

}): PipelineStageSlug {

  const { derivedCurrentStageSlug } = resolveWorkflowPipelineGraphState({

    workflowTasks: workflowProgressInputToWorkflowTasks(input.workflowProgressInput),

    manualStageCompletions: workflowProgressInputToManualStageCompletions(

      input.workflowProgressInput

    ),

    stages: input.stages,

  });



  return derivedCurrentStageSlug ?? CRM_PROJECT_COMPLETE_STAGE_SLUG;

}



export function resolveDerivedWorkflowStageSlugFromProgressIndex(input: {

  readonly summary: Pick<CrmProjectSummary, 'id'>;

  readonly workflowProgressInputIndex: CrmProjectWorkflowProgressInputIndex;

  readonly stages?: readonly PipelineStage[] | null;

}): PipelineStageSlug {

  return resolveDerivedWorkflowStageSlugFromProgressInput({

    workflowProgressInput: getWorkflowProgressInputForProject(

      input.workflowProgressInputIndex,

      input.summary.id

    ),

    stages: input.stages,

  });

}


