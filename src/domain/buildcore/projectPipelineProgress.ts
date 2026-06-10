import type { PipelineStage, PipelineStageSlug } from '@/domain/crm/pipelineStage';
import { resolvePipelineStageCatalog } from '@/domain/crm/pipelineStage';
import { isCrmProjectComplete, type CrmProjectSummary } from '@/domain/crm';

export const PROJECT_PROGRESS_SEGMENT_COUNT = 20;
export const PROJECT_PROGRESS_SEGMENT_STEP = 5;

export type ProjectProgressDisplay = {
  readonly textPercent: number;
  readonly litSegmentCount: number;
};

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
  readonly currentStageSlug: PipelineStageSlug;
  /** Null while parent subprojects are still loading; empty when none exist. */
  readonly childStageSlugs: readonly PipelineStageSlug[] | null;
  readonly isComplete?: boolean;
  readonly stages?: readonly PipelineStage[] | null;
}): ProjectProgressDisplay | null {
  if (input.isComplete) {
    return {
      textPercent: 100,
      litSegmentCount: progressLitSegmentCount(100),
    };
  }

  if (input.childStageSlugs === null) {
    return null;
  }

  if (input.childStageSlugs.length > 0) {
    const childPercents = input.childStageSlugs.map((slug) =>
      pipelineStageProgressPercent(slug, input.stages)
    );
    const rawAverage = averagePipelineProgressPercents(childPercents);
    const textPercent = Math.round(rawAverage);
    return {
      textPercent,
      litSegmentCount: progressLitSegmentCount(textPercent),
    };
  }

  const stagePercent = pipelineStageProgressPercent(input.currentStageSlug, input.stages);
  return {
    textPercent: stagePercent,
    litSegmentCount: progressLitSegmentCount(stagePercent),
  };
}
