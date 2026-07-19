'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { WorkflowTaskStatus } from '@/domain/crm';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { workflowTaskStatusBadgeClass } from '@/presentation/components/crmShared/workflowTaskStatusBadge';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

export type WorkflowTaskSummaryCompactRowProps = {
  readonly title: string;
  readonly status: WorkflowTaskStatus;
  readonly contextLine: string;
  readonly dueAt?: string | null;
  readonly amountCents?: number | null;
  readonly showAmount?: boolean;
  readonly ariaLabel: string;
  readonly onOpen: () => void;
};

/**
 * Presentational compact task/payment row using ProjectDetail workflowTaskCompact* styles.
 * Used by Member My Tasks (and available wherever a read-only compact summary is needed).
 */
export function WorkflowTaskSummaryCompactRow({
  title,
  status,
  contextLine,
  dueAt = null,
  amountCents = null,
  showAmount = false,
  ariaLabel,
  onOpen,
}: WorkflowTaskSummaryCompactRowProps): ReactElement {
  const statusLabel = formatWorkflowStatus(status);
  const dueDisplay = dueAt ? formatShortDate(dueAt) : '';

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      className={`${styles.card} ${styles.workflowTaskCompactCard}`}
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <div className={styles.workflowTaskCompactRow1}>
        <div className={styles.workflowTaskCompactTitleWrap}>
          <span className={styles.workflowTaskCompactTitle}>{title}</span>
        </div>
      </div>
      <p className={styles.workflowNotesPreview}>{contextLine}</p>
      <div className={styles.workflowTaskCompactRow2}>
        <span className={styles.workflowTaskCompactControl}>
          <span className={`${styles.statusDotIndicator} ${workflowTaskStatusBadgeClass(status)}`}>
            <span className={styles.statusDot} aria-hidden />
            <span className={styles.statusDotText}>{statusLabel}</span>
          </span>
        </span>
        <span className={styles.workflowTaskCompactRow2Spacer} aria-hidden />
        <div className={styles.workflowTaskCompactRow2End}>
          {showAmount && amountCents != null ? (
            <span className={styles.workflowTaskCompactControl}>{formatCentsAsUsd(amountCents)}</span>
          ) : null}
          {dueDisplay ? (
            <span className={styles.workflowTaskCompactControl}>{dueDisplay}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
