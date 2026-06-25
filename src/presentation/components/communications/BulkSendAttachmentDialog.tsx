'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { SendAttachmentComposeFields } from '@/presentation/components/communications/SendAttachmentComposeFields';
import { BulkSendCompletionResults } from '@/presentation/components/communications/BulkSendCompletionResults';
import type { BulkSendDeliveryRow, BulkSendDeliveryStatus } from '@/presentation/features/communications/bulkSendCommunication';
import type {
  BulkSubprojectSendRecipient,
  BulkSubprojectSendRecipientSummary,
} from '@/presentation/features/communications/subprojectBulkSendRecipients';
import type { BulkSendAttachmentDialogFeedback } from '@/presentation/features/communications/useBulkSendAttachmentDialog';
import type { SelectedAttachment } from '@/presentation/features/communications/sendAttachmentTypes';
import styles from './SendAttachmentDialog.module.css';

function isDeliveryRow(
  row: BulkSubprojectSendRecipient | BulkSendDeliveryRow
): row is BulkSendDeliveryRow {
  return 'deliveryStatus' in row;
}

export type BulkSendAttachmentDialogProps = {
  readonly open: boolean;
  readonly recipientSummary: BulkSubprojectSendRecipientSummary | null;
  readonly deliveryRows: readonly BulkSendDeliveryRow[];
  readonly subject: string;
  readonly message: string;
  readonly selectedAttachments: readonly SelectedAttachment[];
  readonly sending: boolean;
  readonly progressLabel: string | null;
  readonly feedback: BulkSendAttachmentDialogFeedback | null;
  readonly completed: boolean;
  readonly canSend: boolean;
  readonly readyCount: number;
  readonly onSubjectChange: (value: string) => void;
  readonly onMessageChange: (value: string) => void;
  readonly onAddFiles: (files: readonly File[]) => void;
  readonly onRemoveSelectedAttachment: (attachmentId: string) => void;
  readonly onClose: () => void;
  readonly onSend: () => void;
};

function deliveryStatusLabel(status: BulkSendDeliveryRow['deliveryStatus']): string {
  switch (status) {
    case 'sent':
      return 'Sent';
    case 'failed':
      return 'Failed';
    case 'sending':
      return 'Sending…';
    case 'skipped':
      return 'Skipped';
    default:
      return 'Pending';
  }
}

export function BulkSendAttachmentDialog({
  open,
  recipientSummary,
  deliveryRows,
  subject,
  message,
  selectedAttachments,
  sending,
  progressLabel,
  feedback,
  completed,
  canSend,
  readyCount,
  onSubjectChange,
  onMessageChange,
  onAddFiles,
  onRemoveSelectedAttachment,
  onClose,
  onSend,
}: BulkSendAttachmentDialogProps): ReactElement | null {
  const copy = content.projectDetail.subprojects.bulkSendAttachment;
  const sendCopy = content.projectDetail.communications.sendAttachment;
  const [recipientsExpanded, setRecipientsExpanded] = useState(false);

  if (!open || recipientSummary == null) {
    return null;
  }

  const previewRows =
    completed && deliveryRows.length > 0 ? deliveryRows : recipientSummary.recipients;
  const sendLabel = sending
    ? progressLabel ?? sendCopy.sending
    : copy.sendToRecipients(readyCount);

  return (
    <div
      className={styles.overlay}
      onClick={sending ? undefined : onClose}
      role="presentation"
    >
      <div
        className={[
          styles.panel,
          completed ? styles.panel_completion : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-send-attachment-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="bulk-send-attachment-dialog-title" className={styles.title}>
            {completed ? copy.sentTitle : copy.title}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label={copy.closeAriaLabel}
            disabled={sending}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {completed ? (
          <BulkSendCompletionResults
            recipientSummary={recipientSummary}
            deliveryRows={deliveryRows}
          />
        ) : (
          <>
            <div className={styles.body}>
              <div className={styles.field}>
                <span className={styles.label}>{copy.recipientsHeading}</span>
                <div className={styles.bulkRecipientSummary}>
                  <span>{copy.selectedSummary(recipientSummary.selectedCount)}</span>
                  <span>{copy.readySummary(recipientSummary.readyCount)}</span>
                  {recipientSummary.skippedCount > 0 ? (
                    <span className={styles.bulkRecipientSummarySkipped}>
                      {copy.skippedSummary(recipientSummary.skippedCount)}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.bulkRecipientToggle}
                  aria-expanded={recipientsExpanded}
                  disabled={sending}
                  onClick={() => setRecipientsExpanded((expanded) => !expanded)}
                >
                  {recipientsExpanded ? copy.hideRecipients : copy.showRecipients}
                </button>
                {recipientsExpanded ? (
                  <div className={styles.bulkRecipientList}>
                    {previewRows.map((row) => {
                      const email = row.email;
                      const missingEmail = email == null || email.length === 0;
                      const deliveryStatus: BulkSendDeliveryStatus | null = isDeliveryRow(row)
                        ? row.deliveryStatus
                        : row.status === 'ready'
                          ? 'pending'
                          : 'skipped';
                      return (
                        <div
                          key={row.subprojectId}
                          className={[
                            styles.bulkRecipientRow,
                            missingEmail ? styles.bulkRecipientRow_skipped : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <div className={styles.bulkRecipientRowMain}>
                            <span className={styles.bulkRecipientSubproject}>{row.subprojectName}</span>
                            <span className={styles.bulkRecipientContact}>
                              {row.contactName}
                              {email ? ` · ${email}` : ` · ${copy.unableToSend}`}
                            </span>
                          </div>
                          {isDeliveryRow(row) && row.deliveryStatus !== 'pending' ? (
                            <span
                              className={[
                                styles.bulkRecipientStatus,
                                row.deliveryStatus === 'sent'
                                  ? styles.bulkRecipientStatus_sent
                                  : row.deliveryStatus === 'failed'
                                    ? styles.bulkRecipientStatus_failed
                                    : styles.bulkRecipientStatus_skipped,
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {deliveryStatusLabel(row.deliveryStatus)}
                            </span>
                          ) : deliveryStatus === 'skipped' || missingEmail ? (
                            <span
                              className={`${styles.bulkRecipientStatus} ${styles.bulkRecipientStatus_skipped}`}
                            >
                              {copy.unableToSend}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <SendAttachmentComposeFields
                subject={subject}
                message={message}
                selectedAttachments={selectedAttachments}
                disabled={sending}
                onSubjectChange={onSubjectChange}
                onMessageChange={onMessageChange}
                onAddFiles={onAddFiles}
                onRemoveSelectedAttachment={onRemoveSelectedAttachment}
                subjectInputId="bulk-send-attachment-subject"
                messageInputId="bulk-send-attachment-message"
              />
            </div>

            {feedback?.kind === 'error' ? (
              <p className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
                {feedback.message}
              </p>
            ) : null}

            <div className={styles.footer}>
              <p className={styles.footerHint}>{sendCopy.footerHelper}</p>
              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={sending}
                  onClick={onClose}
                >
                  {sendCopy.cancel}
                </button>
                <button
                  type="button"
                  className={styles.sendBtn}
                  disabled={!canSend || sending}
                  onClick={onSend}
                >
                  {sendLabel}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
