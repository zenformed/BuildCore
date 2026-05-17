'use client';

import type { CSSProperties, ReactElement } from 'react';
import { DEFAULT_PIPELINE_STAGES, type CrmStageProgress, type PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './ProjectDetail.module.css';

type StageNodeState = 'done' | 'current' | 'upcoming';

function resolveStageState(
  slug: PipelineStageSlug,
  currentSlug: PipelineStageSlug,
  completed: ReadonlySet<PipelineStageSlug>
): StageNodeState {
  if (slug === currentSlug) return 'current';
  if (completed.has(slug)) return 'done';
  return 'upcoming';
}

export type StageProgressBarProps = {
  stageProgress: CrmStageProgress;
};

export function StageProgressBar({ stageProgress }: StageProgressBarProps): ReactElement {
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
          const nodeClass =
            state === 'done'
              ? `${styles.pipelineNode} ${styles.pipelineNode_done}`
              : state === 'current'
                ? `${styles.pipelineNode} ${styles.pipelineNode_current}`
                : styles.pipelineNode;
          const labelClass =
            state === 'current'
              ? `${styles.pipelineLabel} ${styles.pipelineLabel_current}`
              : state === 'done'
                ? `${styles.pipelineLabel} ${styles.pipelineLabel_done}`
                : styles.pipelineLabel;

          return (
            <li key={stage.slug} className={styles.pipelineStep} title={stage.label}>
              <span className={nodeClass} aria-hidden />
              <span className={labelClass}>{stage.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
