'use client';

import type { ReactElement } from 'react';
import {
  PROJECT_PROGRESS_SEGMENT_COUNT,
  type ProjectProgressDisplay,
} from '@/domain/buildcore/projectPipelineProgress';
import styles from './ProjectDetail.module.css';

export type ProjectProgressPercentProps = {
  progress: ProjectProgressDisplay;
  variant?: 'default' | 'compact';
  /** `progress` uses calm light-blue; `success` keeps legacy green (e.g. dashboard tables). */
  tone?: 'success' | 'progress';
};

export function ProjectProgressPercent({
  progress,
  variant = 'default',
  tone = 'success',
}: ProjectProgressPercentProps): ReactElement {
  const { textPercent, litSegmentCount } = progress;
  const rootClass = [
    styles.projectProgressPercent,
    variant === 'compact' ? styles.projectProgressPercent_compact : '',
    tone === 'progress' ? styles.projectProgressPercent_toneProgress : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      role="progressbar"
      aria-valuenow={textPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Project progress ${textPercent}%`}
    >
      <div className={styles.projectProgressSegments} aria-hidden>
        {Array.from({ length: PROJECT_PROGRESS_SEGMENT_COUNT }, (_, index) => (
          <span
            key={index}
            className={
              index < litSegmentCount
                ? `${styles.projectProgressSegment} ${styles.projectProgressSegment_lit}`
                : styles.projectProgressSegment
            }
          />
        ))}
      </div>
      <span className={styles.projectProgressLabel}>{textPercent}%</span>
    </div>
  );
}
