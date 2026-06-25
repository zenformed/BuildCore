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
import {
  isExistingAttachmentSelected,
  type ExistingAttachmentOption,
  type SelectedAttachment,
} from '@/presentation/features/communications/sendAttachmentTypes';
import styles from './SendAttachmentDialog.module.css';

export type SendAttachmentComposeFieldsProps = {
  readonly subject: string;
  readonly message: string;
  readonly selectedAttachments: readonly SelectedAttachment[];
  readonly disabled?: boolean;
  readonly onSubjectChange: (value: string) => void;
  readonly onMessageChange: (value: string) => void;
  readonly onAddFiles: (files: readonly File[]) => void;
  readonly onRemoveSelectedAttachment: (attachmentId: string) => void;
  readonly existingDocuments?: readonly ExistingAttachmentOption[];
  readonly onAddExistingDocument?: (document: ExistingAttachmentOption) => void;
  readonly subjectInputId?: string;
  readonly messageInputId?: string;
};

function attachmentTypeLabel(fileName: string, mimeType: string): string {
  return formatDocumentFileTypeLabel(fileName, mimeType);
}

export function SendAttachmentComposeFields({
  subject,
  message,
  selectedAttachments,
  disabled = false,
  onSubjectChange,
  onMessageChange,
  onAddFiles,
  onRemoveSelectedAttachment,
  existingDocuments = [],
  onAddExistingDocument,
  subjectInputId = 'send-attachment-subject',
  messageInputId = 'send-attachment-message',
}: SendAttachmentComposeFieldsProps): ReactElement {
  const copy = content.projectDetail.communications.sendAttachment;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const maxUploadMb = Math.floor(BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES / (1024 * 1024));
  const showExistingDocuments = existingDocuments.length > 0 || onAddExistingDocument != null;

  const selectedAttachmentDetails = useMemo(
    () =>
      selectedAttachments.map((attachment) => ({
        attachment,
        typeLabel: attachmentTypeLabel(attachment.fileName, attachment.mimeType),
        details: formatFileSize(attachment.sizeBytes),
      })),
    [selectedAttachments]
  );

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
    if (disabled) return;
    handleFilesSelected(event.dataTransfer.files);
  };

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={subjectInputId}>
          {copy.subjectLabel}
        </label>
        <input
          id={subjectInputId}
          className={styles.input}
          type="text"
          value={subject}
          disabled={disabled}
          onChange={(event) => onSubjectChange(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={messageInputId}>
          {copy.messageLabel}
        </label>
        <textarea
          id={messageInputId}
          className={styles.textarea}
          value={message}
          placeholder={copy.messagePlaceholder}
          disabled={disabled}
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
            if (!disabled) fileInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (!disabled) fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragOver(true);
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
          disabled={disabled}
          onChange={onFileInputChange}
        />
      </div>

      {showExistingDocuments ? (
        <div className={styles.existingDocumentsSection}>
          <h3 className={styles.sectionHeading}>{copy.existingDocumentsHeading}</h3>
          {existingDocuments.length === 0 ? (
            <p className={styles.existingDocumentsEmpty}>{copy.existingDocumentsEmpty}</p>
          ) : (
            <div className={styles.existingDocumentsList}>
              {existingDocuments.map((document) => {
                const added = isExistingAttachmentSelected(selectedAttachments, document.crmDocumentId);
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
                        {attachmentTypeLabel(document.fileName, document.mimeType)} ·{' '}
                        {formatFileSize(document.sizeBytes)}
                        {document.uploadedAt ? ` · ${formatShortDate(document.uploadedAt)}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={[styles.rowActionBtn, added ? styles.rowActionBtnAdded : '']
                        .filter(Boolean)
                        .join(' ')}
                      disabled={disabled || added || onAddExistingDocument == null}
                      onClick={() => onAddExistingDocument?.(document)}
                    >
                      {added ? copy.addedExistingFile : copy.addExistingFile}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

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
                disabled={disabled}
                onClick={() => onRemoveSelectedAttachment(attachment.id)}
              >
                {copy.removeSelectedFile}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
