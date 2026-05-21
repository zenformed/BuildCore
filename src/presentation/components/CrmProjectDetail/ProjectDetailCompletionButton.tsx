'use client';

import type { ReactElement } from 'react';
import styles from './ProjectDetail.module.css';

export type ProjectDetailCompletionButtonProps = {
  isComplete: boolean;
  busy: boolean;
  onMarkComplete: () => void;
  onMarkIncomplete: () => void;
  markCompleteLabel: string;
  markIncompleteLabel: string;
};

export function ProjectDetailCompletionButton({
  isComplete,
  busy,
  onMarkComplete,
  onMarkIncomplete,
  markCompleteLabel,
  markIncompleteLabel,
}: ProjectDetailCompletionButtonProps): ReactElement {
  return (
    <button
      type="button"
      className={
        isComplete
          ? `${styles.stageChip} ${styles.headerChipBtn} ${styles.completionBtn} ${styles.completionBtnComplete}`
          : `${styles.stageChip} ${styles.headerChipBtn} ${styles.completionBtn}`
      }
      disabled={busy}
      onClick={isComplete ? onMarkIncomplete : onMarkComplete}
    >
      {isComplete ? markIncompleteLabel : markCompleteLabel}
    </button>
  );
}
