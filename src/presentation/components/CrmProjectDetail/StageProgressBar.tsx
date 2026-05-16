'use client';

import type { ReactElement } from 'react';
import { DEFAULT_PIPELINE_STAGES, type CrmStageProgress } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import styles from './ProjectDetail.module.css';

export type StageProgressBarProps = {
  stageProgress: CrmStageProgress;
};

export function StageProgressBar({ stageProgress }: StageProgressBarProps): ReactElement {
  const currentOrder = DEFAULT_PIPELINE_STAGES.find((s) => s.slug === stageProgress.currentStageSlug)?.sortOrder ?? 0;
  const completed = new Set(stageProgress.completedStageSlugs);

  return (
    <section className={styles.card} aria-labelledby="stage-progress-heading">
      <h3 id="stage-progress-heading" className={styles.cardTitle}>
        {content.projectDetail.sections.pipeline}
      </h3>
      <div className={styles.progressWrap}>
        <div className={styles.progressTrack} role="list" aria-label={content.projectDetail.pipelineAriaLabel}>
          {DEFAULT_PIPELINE_STAGES.map((stage) => {
            let segmentClass = styles.progressSegment;
            if (completed.has(stage.slug)) {
              segmentClass = `${styles.progressSegment} ${styles.progressSegment_done}`;
            } else if (stage.slug === stageProgress.currentStageSlug) {
              segmentClass = `${styles.progressSegment} ${styles.progressSegment_current}`;
            }
            return (
              <span
                key={stage.slug}
                className={segmentClass}
                role="listitem"
                title={stage.label}
                aria-label={stage.label}
              />
            );
          })}
        </div>
        <div className={styles.progressLabels}>
          <span>{DEFAULT_PIPELINE_STAGES[0]?.label}</span>
          <span>{DEFAULT_PIPELINE_STAGES[DEFAULT_PIPELINE_STAGES.length - 1]?.label}</span>
        </div>
        <p className={styles.progressCurrentLabel}>
          {content.projectDetail.currentStage}: {formatStageLabel(stageProgress.currentStageSlug)} ({currentOrder}/
          {DEFAULT_PIPELINE_STAGES.length})
        </p>
      </div>
    </section>
  );
}
