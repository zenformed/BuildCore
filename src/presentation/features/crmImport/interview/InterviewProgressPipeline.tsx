'use client';

import type { ReactElement } from 'react';
import type { CrmImportProgressMilestone } from '@/presentation/features/crmImport/interview/interviewState';
import styles from './InterviewProgressPipeline.module.css';

export type InterviewProgressPipelineProps = {
  readonly milestones: readonly {
    readonly id: CrmImportProgressMilestone;
    readonly label: string;
  }[];
  readonly current: CrmImportProgressMilestone;
  readonly completed: ReadonlySet<CrmImportProgressMilestone>;
};

export function InterviewProgressPipeline({
  milestones,
  current,
  completed,
}: InterviewProgressPipelineProps): ReactElement {
  const currentIndex = Math.max(
    0,
    milestones.findIndex((m) => m.id === current)
  );
  const progressRatio =
    milestones.length <= 1 ? 1 : currentIndex / Math.max(1, milestones.length - 1);

  return (
    <div className={styles.panel} aria-label="Import progress">
      <div className={styles.surface}>
        <div className={styles.track} aria-hidden />
        <div
          className={styles.trackActive}
          style={{ width: `${Math.max(0, Math.min(1, progressRatio)) * 100}%` }}
          aria-hidden
        />
        <ol className={styles.timeline}>
          {milestones.map((milestone, index) => {
            const isDone = completed.has(milestone.id) || index < currentIndex;
            const isCurrent = milestone.id === current;
            return (
              <li key={milestone.id} className={styles.step}>
                <span
                  className={[
                    styles.node,
                    isDone ? styles.nodeDone : '',
                    isCurrent ? styles.nodeCurrent : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isCurrent ? 'step' : undefined}
                />
                <span
                  className={[
                    styles.label,
                    isDone ? styles.labelDone : '',
                    isCurrent ? styles.labelCurrent : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {milestone.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
