'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CommunicationRecipientPicker } from '@/presentation/components/communications/CommunicationRecipientPicker';
import { SendAttachmentComposeFields } from '@/presentation/components/communications/SendAttachmentComposeFields';
import type { CommunicationRecipientOption } from '@/presentation/features/communications/communicationRecipientTypes';
import type { SendAttachmentDialogFeedback } from '@/presentation/features/communications/useSendAttachmentDialog';
import type {
  ExistingAttachmentOption,
  SelectedAttachment,
  SendAttachmentDialogContext,
} from '@/presentation/features/communications/sendAttachmentTypes';
import styles from './SendAttachmentDialog.module.css';

export type SendAttachmentDialogProps = {
  readonly context: SendAttachmentDialogContext | null;
  readonly recipientOptions: readonly CommunicationRecipientOption[];
  readonly selectedRecipient: CommunicationRecipientOption | null;
  readonly onRecipientChange: (recipientId: string) => void;
  readonly subject: string;
  readonly message: string;
  readonly selectedAttachments: readonly SelectedAttachment[];
  readonly sending: boolean;
  readonly feedback: SendAttachmentDialogFeedback | null;
  readonly canSend: boolean;
  readonly onSubjectChange: (value: string) => void;
  readonly onMessageChange: (value: string) => void;
  readonly onAddFiles: (files: readonly File[]) => void;
  readonly onAddExistingDocument: (document: ExistingAttachmentOption) => void;
  readonly onRemoveSelectedAttachment: (attachmentId: string) => void;
  readonly onClose: () => void;
  readonly onSend: () => void;
};

export function SendAttachmentDialog({
  context,
  recipientOptions,
  selectedRecipient,
  onRecipientChange,
  subject,
  message,
  selectedAttachments,
  sending,
  feedback,
  canSend,
  onSubjectChange,
  onMessageChange,
  onAddFiles,
  onAddExistingDocument,
  onRemoveSelectedAttachment,
  onClose,
  onSend,
}: SendAttachmentDialogProps): ReactElement | null {
  const copy = content.projectDetail.communications.sendAttachment;
  const sent = feedback?.kind === 'success';
  const existingDocuments = context?.existingDocuments ?? [];

  if (context == null) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onClick={sending ? undefined : onClose}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-attachment-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="send-attachment-dialog-title" className={styles.title}>
            {sent ? copy.sentTitle : copy.title}
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

        {sent ? (
          <div className={styles.successBody}>
            <p className={styles.successMessage}>{feedback?.message ?? copy.success}</p>
          </div>
        ) : (
          <>
            <div className={styles.body}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="send-attachment-to">
                  {copy.toLabel}
                </label>
                <div id="send-attachment-to" className={styles.recipientField}>
                  <CommunicationRecipientPicker
                    recipientOptions={recipientOptions}
                    selectedRecipient={selectedRecipient}
                    disabled={sending}
                    onRecipientChange={onRecipientChange}
                  />
                </div>
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
                existingDocuments={existingDocuments}
                onAddExistingDocument={onAddExistingDocument}
              />
            </div>

            {feedback?.kind === 'error' ? (
              <p className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
                {feedback.message}
              </p>
            ) : null}

            <div className={styles.footer}>
              <p className={styles.footerHint}>{copy.footerHelper}</p>
              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={sending}
                  onClick={onClose}
                >
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  className={styles.sendBtn}
                  disabled={!canSend || sending}
                  onClick={onSend}
                >
                  {sending ? copy.sending : copy.send}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
