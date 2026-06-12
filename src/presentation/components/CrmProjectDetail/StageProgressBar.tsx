'use client';

import type { ReactElement } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSyncExternalStore } from 'react';
import type { CrmProjectStageCompletion, CrmWorkflowTask } from '@/domain/crm';
import { resolveWorkflowPipelineGraphState } from '@/domain/buildcore/projectPipelineProgress';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { shortStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { PROJECT_DETAIL_STACK_BREAKPOINT_PX } from '@/presentation/features/crmProjectDetail/useProjectDetailStackedLayout';
import styles from './ProjectDetail.module.css';

const COMPACT_PIPELINE_MEDIA = `(max-width: ${PROJECT_DETAIL_STACK_BREAKPOINT_PX}px)`;

function subscribeCompactPipeline(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(COMPACT_PIPELINE_MEDIA);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getCompactPipelineSnapshot(): boolean {
  return window.matchMedia(COMPACT_PIPELINE_MEDIA).matches;
}

function useCompactPipelineLabels(): boolean {
  return useSyncExternalStore(
    subscribeCompactPipeline,
    getCompactPipelineSnapshot,
    () => false
  );
}

type PipelineProgressLine = {
  readonly leftPx: number;
  readonly widthPx: number;
};

function measurePipelineProgressLine(
  timeline: HTMLElement,
  track: HTMLElement,
  nodeElements: readonly (HTMLSpanElement | null)[],
  continuousCompletedStageIndex: number
): PipelineProgressLine | null {
  if (continuousCompletedStageIndex < 0) return null;

  const endNode = nodeElements[continuousCompletedStageIndex];
  if (endNode == null) return null;

  const timelineRect = timeline.getBoundingClientRect();
  const trackRect = track.getBoundingClientRect();
  const endRect = endNode.getBoundingClientRect();

  const trackLeft = trackRect.left - timelineRect.left;
  const endCenter = endRect.left + endRect.width / 2 - timelineRect.left;
  const endRadius = endRect.width / 2;

  return {
    leftPx: trackLeft,
    widthPx: Math.max(0, endCenter + endRadius - trackLeft),
  };
}

export type StageProgressBarProps = {
  workflowTasks: readonly CrmWorkflowTask[];
  manualStageCompletions: readonly CrmProjectStageCompletion[];
};

export function StageProgressBar({
  workflowTasks,
  manualStageCompletions,
}: StageProgressBarProps): ReactElement {
  const useShortLabels = useCompactPipelineLabels();
  const { project } = useProjectDetailShell();
  const { catalogForProject } = useBuildCorePipelineStages();
  const catalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const timelineRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [progressLine, setProgressLine] = useState<PipelineProgressLine | null>(null);
  const graphState = useMemo(
    () =>
      resolveWorkflowPipelineGraphState({
        workflowTasks,
        stages: catalog,
        manualStageCompletions,
      }),
    [catalog, manualStageCompletions, workflowTasks]
  );
  const continuousCompletedStageIndex = graphState.continuousCompletedStageIndex;
  const stageCount = graphState.stageStatuses.length;

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    if (timeline == null) {
      setProgressLine(null);
      return;
    }

    const measure = (): void => {
      const track = trackRef.current;
      if (track == null) {
        setProgressLine(null);
        return;
      }

      setProgressLine(
        measurePipelineProgressLine(
          timeline,
          track,
          nodeRefs.current,
          continuousCompletedStageIndex
        )
      );
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(timeline);
    if (trackRef.current != null) resizeObserver.observe(trackRef.current);
    for (const node of nodeRefs.current) {
      if (node != null) resizeObserver.observe(node);
    }

    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [continuousCompletedStageIndex, stageCount, useShortLabels]);

  return (
    <section
      className={styles.pipelinePanel}
      aria-label={content.projectDetail.pipelineAriaLabel}
    >
      <div ref={timelineRef} className={styles.pipelineTimelineSurface}>
        <div ref={trackRef} className={styles.pipelineProgressTrack} aria-hidden />
        {progressLine != null ? (
          <div
            className={styles.pipelineProgressActive}
            aria-hidden
            style={{ left: `${progressLine.leftPx}px`, width: `${progressLine.widthPx}px` }}
          />
        ) : null}
        <ol className={styles.pipelineTimeline}>
          {graphState.stageStatuses.map((stage, index) => {
            const nodeClass = stage.isComplete
              ? `${styles.pipelineNode} ${styles.pipelineNode_done}`
              : styles.pipelineNode;
            const labelClass = stage.isComplete
              ? `${styles.pipelineLabel} ${styles.pipelineLabel_done}`
              : styles.pipelineLabel;

            const label = useShortLabels ? shortStageLabel(stage.stageLabel) : stage.stageLabel;

            return (
              <li key={stage.stageSlug} className={styles.pipelineStep} title={stage.stageLabel}>
                <span
                  ref={(element) => {
                    nodeRefs.current[index] = element;
                  }}
                  className={nodeClass}
                  aria-hidden
                />
                <span className={labelClass}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
