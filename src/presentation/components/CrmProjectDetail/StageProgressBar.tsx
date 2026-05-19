'use client';

import type { CSSProperties, ReactElement } from 'react';
import { useSyncExternalStore } from 'react';
import { DEFAULT_PIPELINE_STAGES, type CrmStageProgress, type PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { shortStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
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

type StageNodeState = 'done' | 'current' | 'upcoming';

function resolveStageState(
  slug: PipelineStageSlug,
  currentSlug: PipelineStageSlug,
  completed: ReadonlySet<PipelineStageSlug>
): StageNodeState {
  if (!completed.has(slug)) return 'upcoming';
  if (slug === currentSlug) return 'current';
  return 'done';
}

export type StageProgressBarProps = {
  stageProgress: CrmStageProgress;
};

export function StageProgressBar({ stageProgress }: StageProgressBarProps): ReactElement {
  const useShortLabels = useCompactPipelineLabels();
  const completed = new Set(stageProgress.completedStageSlugs);
  const currentIndex = DEFAULT_PIPELINE_STAGES.findIndex((s) => s.slug === stageProgress.currentStageSlug);
  const progressPct =
    DEFAULT_PIPELINE_STAGES.length <= 1
      ? 0
      : (Math.max(0, currentIndex) / (DEFAULT_PIPELINE_STAGES.length - 1)) * 100;

  return (
    <section className={styles.pipelinePanel} aria-label={content.projectDetail.pipelineAriaLabel}>
      <ol
        className={styles.pipelineTimeline}
        style={{ '--pipeline-progress': `${progressPct}%` } as CSSProperties}
      >
        {DEFAULT_PIPELINE_STAGES.map((stage) => {
          const state = resolveStageState(stage.slug, stageProgress.currentStageSlug, completed);
          const isReached = state !== 'upcoming';
          const nodeClass = isReached
            ? `${styles.pipelineNode} ${styles.pipelineNode_done}${state === 'current' ? ` ${styles.pipelineNode_current}` : ''}`
            : styles.pipelineNode;
          const labelClass =
            state === 'current'
              ? `${styles.pipelineLabel} ${styles.pipelineLabel_done} ${styles.pipelineLabel_current}`
              : state === 'done'
                ? `${styles.pipelineLabel} ${styles.pipelineLabel_done}`
                : styles.pipelineLabel;

          const label = useShortLabels ? shortStageLabel(stage.label) : stage.label;

          return (
            <li key={stage.slug} className={styles.pipelineStep} title={stage.label}>
              <span className={nodeClass} aria-hidden />
              <span className={labelClass}>{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
