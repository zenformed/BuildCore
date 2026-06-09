import type { PipelineStageSlug } from '@/domain/crm/pipelineStage';

/** Fixed pipeline stage progress percentages for BuildCore project detail UI. */
export const PIPELINE_STAGE_PROGRESS_PERCENT: Readonly<Record<PipelineStageSlug, number>> = {
  'new-lead': 0,
  contacted: 10,
  'inspection-scheduled': 20,
  'inspection-complete': 30,
  'estimate-sent': 40,
  'waiting-on-approval': 50,
  approved: 60,
  scheduled: 70,
  'in-progress': 85,
  completed: 95,
  invoiced: 98,
  paid: 100,
};

export const PROJECT_PROGRESS_SEGMENT_COUNT = 20;
export const PROJECT_PROGRESS_SEGMENT_STEP = 5;

export type ProjectProgressDisplay = {
  readonly textPercent: number;
  readonly litSegmentCount: number;
};

export function pipelineStageProgressPercent(stageSlug: PipelineStageSlug): number {
  return PIPELINE_STAGE_PROGRESS_PERCENT[stageSlug];
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

export function resolveProjectDetailProgressDisplay(input: {
  readonly currentStageSlug: PipelineStageSlug;
  /** Null while parent subprojects are still loading; empty when none exist. */
  readonly childStageSlugs: readonly PipelineStageSlug[] | null;
}): ProjectProgressDisplay | null {
  if (input.childStageSlugs === null) {
    return null;
  }

  if (input.childStageSlugs.length > 0) {
    const childPercents = input.childStageSlugs.map(pipelineStageProgressPercent);
    const rawAverage = averagePipelineProgressPercents(childPercents);
    const textPercent = Math.round(rawAverage);
    return {
      textPercent,
      litSegmentCount: progressLitSegmentCount(textPercent),
    };
  }

  const stagePercent = pipelineStageProgressPercent(input.currentStageSlug);
  return {
    textPercent: stagePercent,
    litSegmentCount: progressLitSegmentCount(stagePercent),
  };
}
