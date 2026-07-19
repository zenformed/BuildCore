'use client';

import type { ReactElement, ReactNode } from 'react';
import type { WorkflowTaskStatus } from '@/domain/crm';
import type { CrmDocumentMetadata } from '@/domain/crm/document';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { workflowTaskStatusBadgeClass } from '@/presentation/components/crmShared/workflowTaskStatusBadge';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

export type CrmTaskAssignmentDetailPanelProps = {
  readonly headingId: string;
  readonly heading: string;
  readonly title: string;
  readonly contextLine: string;
  readonly status: WorkflowTaskStatus;
  readonly dueAt: string | null;
  readonly notes: string | null;
  readonly notesEmptyLabel: string;
  readonly stageOrPaymentLabel: string;
  readonly stageOrPaymentHeading: string;
  readonly amountCents?: number | null;
  readonly showAmount?: boolean;
  readonly amountLabel?: string;
  readonly documents: readonly CrmDocumentMetadata[];
  readonly documentsLabel: string;
  readonly documentsEmptyLabel: string;
  readonly statusLabel: string;
  readonly dueLabel: string;
  readonly notesLabel: string;
  readonly inactiveMessage?: string | null;
  readonly footer?: ReactNode;
};

/**
 * Shared assignment detail panel (workflow or payment) for Member task detail.
 * Uses ProjectDetail card/dl/status tokens — not a separate Member visual system.
 */
export function CrmTaskAssignmentDetailPanel({
  headingId,
  heading,
  title,
  contextLine,
  status,
  dueAt,
  notes,
  notesEmptyLabel,
  stageOrPaymentLabel,
  stageOrPaymentHeading,
  amountCents = null,
  showAmount = false,
  amountLabel,
  documents,
  documentsLabel,
  documentsEmptyLabel,
  statusLabel,
  dueLabel,
  notesLabel,
  inactiveMessage = null,
  footer = null,
}: CrmTaskAssignmentDetailPanelProps): ReactElement {
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.cardTitle}>
        {heading}
      </h3>
      <p className={styles.customerName}>{title}</p>
      <p className={styles.workflowNotesPreview}>{contextLine}</p>
      <dl className={styles.dl}>
        <div className={styles.dlRow}>
          <dt>{statusLabel}</dt>
          <dd>
            <span className={`${styles.statusPill} ${workflowTaskStatusBadgeClass(status)}`}>
              {formatWorkflowStatus(status)}
            </span>
          </dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{dueLabel}</dt>
          <dd>{dueAt ? formatShortDate(dueAt) : '—'}</dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{stageOrPaymentHeading}</dt>
          <dd>{stageOrPaymentLabel}</dd>
        </div>
        {showAmount ? (
          <div className={styles.dlRow}>
            <dt>{amountLabel}</dt>
            <dd>{amountCents != null ? formatCentsAsUsd(amountCents) : '—'}</dd>
          </div>
        ) : null}
        <div className={styles.dlRow}>
          <dt>{notesLabel}</dt>
          <dd>
            {notes?.trim() ? (
              <p className={styles.notesBlock}>{notes.trim()}</p>
            ) : (
              notesEmptyLabel
            )}
          </dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{documentsLabel}</dt>
          <dd>
            {documents.length === 0 ? (
              documentsEmptyLabel
            ) : (
              <ul className={styles.docList}>
                {documents.map((doc) => (
                  <li key={doc.id} className={styles.docListItem}>
                    {doc.name}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      {inactiveMessage ? <p className={styles.subtitle}>{inactiveMessage}</p> : null}
      {footer}
    </section>
  );
}
