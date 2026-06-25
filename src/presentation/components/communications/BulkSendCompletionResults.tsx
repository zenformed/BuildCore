'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  orderBulkSendCompletionRows,
  summarizeBulkSendDeliveryRows,
  type BulkSendDeliveryRow,
} from '@/presentation/features/communications/bulkSendCommunication';
import type { BulkSubprojectSendRecipientSummary } from '@/presentation/features/communications/subprojectBulkSendRecipients';
import styles from './SendAttachmentDialog.module.css';

export type BulkSendCompletionResultsProps = {
  readonly recipientSummary: BulkSubprojectSendRecipientSummary;
  readonly deliveryRows: readonly BulkSendDeliveryRow[];
};

function statusLabel(row: BulkSendDeliveryRow): string {
  const copy = content.projectDetail.subprojects.bulkSendAttachment;
  switch (row.deliveryStatus) {
    case 'sent':
      return copy.statusSent;
    case 'failed':
      return copy.statusFailed;
    case 'skipped':
      return copy.statusMissingEmail;
    default:
      return copy.statusSent;
  }
}

function statusClassName(row: BulkSendDeliveryRow): string {
  switch (row.deliveryStatus) {
    case 'sent':
      return styles.bulkSendResultStatus_sent;
    case 'failed':
      return styles.bulkSendResultStatus_failed;
    default:
      return styles.bulkSendResultStatus_skipped;
  }
}

function displayContactName(row: BulkSendDeliveryRow, emptyCell: string): string {
  if (row.deliveryStatus === 'skipped') return emptyCell;
  const name = row.contactName.trim();
  return name.length > 0 ? name : emptyCell;
}

function displayEmail(row: BulkSendDeliveryRow, emptyCell: string): string {
  const email = row.email?.trim() ?? '';
  return email.length > 0 ? email : emptyCell;
}

export function BulkSendCompletionResults({
  recipientSummary,
  deliveryRows,
}: BulkSendCompletionResultsProps): ReactElement {
  const copy = content.projectDetail.subprojects.bulkSendAttachment;
  const completionRows = useMemo(
    () => orderBulkSendCompletionRows(recipientSummary.recipients, deliveryRows),
    [deliveryRows, recipientSummary.recipients]
  );
  const { sentCount, failedCount, skippedCount } = useMemo(
    () => summarizeBulkSendDeliveryRows(completionRows),
    [completionRows]
  );

  return (
    <div className={styles.bulkSendCompleteBody}>
      <p className={styles.bulkSendResultsSummary}>
        {copy.completionSummary(sentCount, failedCount, skippedCount)}
      </p>

      <div className={styles.bulkSendResultsScroll} role="region" aria-label={copy.resultsRegionAriaLabel}>
        <table className={styles.bulkSendResultsTable}>
          <thead>
            <tr>
              <th scope="col">{copy.resultsColumnSubproject}</th>
              <th scope="col">{copy.resultsColumnContact}</th>
              <th scope="col">{copy.resultsColumnEmail}</th>
              <th scope="col">{copy.resultsColumnStatus}</th>
            </tr>
          </thead>
          <tbody>
            {completionRows.map((row) => (
              <tr key={row.subprojectId}>
                <td className={styles.bulkSendResultsSubproject}>{row.subprojectName}</td>
                <td>{displayContactName(row, copy.emptyCell)}</td>
                <td className={styles.bulkSendResultsEmail}>{displayEmail(row, copy.emptyCell)}</td>
                <td>
                  <div className={styles.bulkSendResultStatusCell}>
                    <span className={`${styles.bulkSendResultStatus} ${statusClassName(row)}`}>
                      {statusLabel(row)}
                    </span>
                    {row.deliveryStatus === 'failed' && row.errorMessage ? (
                      <span className={styles.bulkSendResultError}>{row.errorMessage}</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.bulkSendResultsCards}>
          {completionRows.map((row) => (
            <article key={row.subprojectId} className={styles.bulkSendResultCard}>
              <div className={styles.bulkSendResultCardHeader}>
                <span className={styles.bulkSendResultsSubproject}>{row.subprojectName}</span>
                <span className={`${styles.bulkSendResultStatus} ${statusClassName(row)}`}>
                  {statusLabel(row)}
                </span>
              </div>
              <dl className={styles.bulkSendResultCardDetails}>
                <div className={styles.bulkSendResultCardRow}>
                  <dt>{copy.resultsColumnContact}</dt>
                  <dd>{displayContactName(row, copy.emptyCell)}</dd>
                </div>
                <div className={styles.bulkSendResultCardRow}>
                  <dt>{copy.resultsColumnEmail}</dt>
                  <dd className={styles.bulkSendResultsEmail}>{displayEmail(row, copy.emptyCell)}</dd>
                </div>
              </dl>
              {row.deliveryStatus === 'failed' && row.errorMessage ? (
                <p className={styles.bulkSendResultError}>{row.errorMessage}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
