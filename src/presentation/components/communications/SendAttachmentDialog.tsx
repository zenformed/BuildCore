'use client';

import type { ChangeEvent, DragEvent, ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS,
  BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES,
} from '@/domain/crm/buildCoreUploadPolicy';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatFileSize,
  formatShortDate,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { formatDocumentFileTypeLabel } from '@/presentation/features/crmProjectDetail/workflowDocumentFileIconType';
import { WorkflowDocumentFileIcon } from '@/presentation/components/CrmProjectDetail/WorkflowDocumentFileIcon';
import { CommunicationRecipientPicker } from '@/presentation/components/communications/CommunicationRecipientPicker';
import type { CommunicationRecipientOption } from '@/presentation/features/communications/communicationRecipientTypes';
import type { SendAttachmentDialogFeedback } from '@/presentation/features/communications/useSendAttachmentDialog';
import {
  isExistingAttachmentSelected,
  type ExistingAttachmentOption,
  type SelectedAttachment,
  type SendAttachmentDialogContext,
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

function attachmentTypeLabel(fileName: string, mimeType: string): string {
  return formatDocumentFileTypeLabel(fileName, mimeType);
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const sent = feedback?.kind === 'success';
  const maxUploadMb = Math.floor(BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES / (1024 * 1024));

  const existingDocuments = context?.existingDocuments ?? [];

  const selectedAttachmentDetails = useMemo(
    () =>
      selectedAttachments.map((attachment) => ({
        attachment,
        typeLabel: attachmentTypeLabel(attachment.fileName, attachment.mimeType),
        details: formatFileSize(attachment.sizeBytes),
      })),
    [selectedAttachments]
  );

  if (context == null) {
    return null;
  }

  const handleFilesSelected = (selected: FileList | null): void => {
    if (selected == null || selected.length === 0) return;
    onAddFiles(Array.from(selected));
  };

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleFilesSelected(event.target.files);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    if (sending) return;
    handleFilesSelected(event.dataTransfer.files);
  };

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

              <div className={styles.field}>
                <label className={styles.label} htmlFor="send-attachment-subject">
                  {copy.subjectLabel}
                </label>
                <input
                  id="send-attachment-subject"
                  className={styles.input}
                  type="text"
                  value={subject}
                  disabled={sending}
                  onChange={(event) => onSubjectChange(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="send-attachment-message">
                  {copy.messageLabel}
                </label>
                <textarea
                  id="send-attachment-message"
                  className={styles.textarea}
                  value={message}
                  placeholder={copy.messagePlaceholder}
                  disabled={sending}
                  onChange={(event) => onMessageChange(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>{copy.attachmentsLabel}</span>
                <div
                  className={[styles.uploadZone, dragOver ? styles.uploadZone_dragOver : '']
                    .filter(Boolean)
                    .join(' ')}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!sending) fileInputRef.current?.click();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (!sending) fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!sending) setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <p className={styles.uploadHint}>{copy.uploadHint}</p>
                  <p className={styles.uploadSubHint}>
                    {copy.uploadMaxSizeNote.replace('{maxMb}', String(maxUploadMb))}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  className={styles.fileInput}
                  type="file"
                  multiple
                  accept={BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS.join(',')}
                  disabled={sending}
                  onChange={onFileInputChange}
                />
              </div>

              <div className={styles.existingDocumentsSection}>
                <h3 className={styles.sectionHeading}>{copy.existingDocumentsHeading}</h3>
                {existingDocuments.length === 0 ? (
                  <p className={styles.existingDocumentsEmpty}>{copy.existingDocumentsEmpty}</p>
                ) : (
                  <div className={styles.existingDocumentsList}>
                    {existingDocuments.map((document) => {
                      const added = isExistingAttachmentSelected(
                        selectedAttachments,
                        document.crmDocumentId
                      );
                      const typeLabel = attachmentTypeLabel(document.fileName, document.mimeType);
                      return (
                        <div key={document.crmDocumentId} className={styles.existingDocumentRow}>
                          <WorkflowDocumentFileIcon
                            fileName={document.fileName}
                            mimeType={document.mimeType}
                            modal
                          />
                          <div className={styles.fileMeta}>
                            <span className={styles.fileName}>{document.fileName}</span>
                            <span className={styles.fileDetails}>
                              {typeLabel} · {formatFileSize(document.sizeBytes)}
                              {document.uploadedAt
                                ? ` · ${formatShortDate(document.uploadedAt)}`
                                : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={[
                              styles.rowActionBtn,
                              added ? styles.rowActionBtnAdded : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            disabled={sending || added}
                            onClick={() => onAddExistingDocument(document)}
                          >
                            {added ? copy.addedExistingFile : copy.addExistingFile}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedAttachmentDetails.length > 0 ? (
                <div className={styles.selectedAttachmentsSection}>
                  <h3 className={styles.sectionHeading}>{copy.selectedAttachmentsHeading}</h3>
                  {selectedAttachmentDetails.map(({ attachment, typeLabel, details }) => (
                    <div key={attachment.id} className={styles.selectedAttachmentRow}>
                      <WorkflowDocumentFileIcon
                        fileName={attachment.fileName}
                        mimeType={attachment.mimeType}
                        modal
                      />
                      <div className={styles.fileMeta}>
                        <span className={styles.fileName}>{attachment.fileName}</span>
                        <span className={styles.fileDetails}>
                          {typeLabel} · {details}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.rowActionBtn}
                        disabled={sending}
                        onClick={() => onRemoveSelectedAttachment(attachment.id)}
                      >
                        {copy.removeSelectedFile}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
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
