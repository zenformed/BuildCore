'use client';

import type { ReactElement } from 'react';
import { CrmProjectStatusCircleIcon } from '@/presentation/components/crmShared/CrmProjectStatusCircleIcon';
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
  const label = isComplete ? markIncompleteLabel : markCompleteLabel;

  return (
    <button
      type="button"
      className={styles.headerIconBtn}
      disabled={busy}
      title={label}
      aria-label={label}
      aria-pressed={isComplete}
      aria-busy={busy || undefined}
      onClick={isComplete ? onMarkIncomplete : onMarkComplete}
    >
      <CrmProjectStatusCircleIcon kind="complete" active={isComplete} size={18} />
    </button>
  );
}
