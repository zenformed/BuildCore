'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  bulkSendSubprojectCommunications,
  type BulkSendDeliveryRow,
  type BulkSendCommunicationResult,
} from '@/presentation/features/communications/bulkSendCommunication';
import {
  resolveSelectedAttachmentDocumentIds,
  validateSelectedNewFiles,
} from '@/presentation/features/communications/sendAttachmentAttachmentState';
import {
  buildBulkSubprojectSendDefaultSubject,
  resolveBulkSubprojectSendRecipients,
  type BulkSubprojectSendRecipientSummary,
} from '@/presentation/features/communications/subprojectBulkSendRecipients';
import type { ExistingAttachmentOption, SelectedAttachment } from '@/presentation/features/communications/sendAttachmentTypes';
import { isSendAttachmentFormValid } from '@/presentation/features/communications/sendAttachmentTypes';

export type BulkSendAttachmentDialogFeedback = {
  readonly kind: 'error' | 'complete';
  readonly message: string;
};

export type UseBulkSendAttachmentDialogOptions = {
  readonly parentProjectSlug: string;
  readonly parentProjectName: string;
  readonly onComplete?: (result: BulkSendCommunicationResult) => void;
};

export function useBulkSendAttachmentDialog(options: UseBulkSendAttachmentDialogOptions) {
  const copy = content.projectDetail.subprojects.bulkSendAttachment;
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<readonly SelectedAttachment[]>([]);
  const [recipientSummary, setRecipientSummary] = useState<BulkSubprojectSendRecipientSummary | null>(
    null
  );
  const [sending, setSending] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [deliveryRows, setDeliveryRows] = useState<readonly BulkSendDeliveryRow[]>([]);
  const [feedback, setFeedback] = useState<BulkSendAttachmentDialogFeedback | null>(null);
  const [completed, setCompleted] = useState(false);

  const uploadScope = useMemo(
    () =>
      ({
        scope: 'project_media',
        projectSlug: options.parentProjectSlug,
      }) as const,
    [options.parentProjectSlug]
  );

  const readyCount = recipientSummary?.readyCount ?? 0;

  const canSend = useMemo(() => {
    if (!open || sending || completed || readyCount === 0) return false;
    return isSendAttachmentFormValid({
      recipientEmail: 'bulk-ready@placeholder.local',
      subject,
      message,
      selectedAttachments,
    });
  }, [completed, message, open, readyCount, selectedAttachments, sending, subject]);

  const closeDialog = useCallback(() => {
    if (sending) return;
    setOpen(false);
    setSubject('');
    setMessage('');
    setSelectedAttachments([]);
    setRecipientSummary(null);
    setProgressLabel(null);
    setDeliveryRows([]);
    setFeedback(null);
    setCompleted(false);
  }, [sending]);

  const openBulkSendAttachmentDialog = useCallback((subprojects: readonly CrmProjectSummary[]) => {
    const summary = resolveBulkSubprojectSendRecipients(subprojects);
    setRecipientSummary(summary);
    setSubject(buildBulkSubprojectSendDefaultSubject(options.parentProjectName));
    setMessage('');
    setSelectedAttachments([]);
    setProgressLabel(null);
    setDeliveryRows([]);
    setFeedback(null);
    setCompleted(false);
    setOpen(true);
  }, [options.parentProjectName]);

  const addFiles = useCallback((incoming: readonly File[]) => {
    const { attachments, errorMessage } = validateSelectedNewFiles(incoming);
    if (errorMessage != null) {
      setFeedback({ kind: 'error', message: errorMessage });
    }
    if (attachments.length === 0) return;
    setFeedback(null);
    setSelectedAttachments((current) => [...current, ...attachments]);
  }, []);

  const addExistingDocument = useCallback((_document: ExistingAttachmentOption) => {
    // Bulk V1 does not expose existing document picker.
  }, []);

  const removeSelectedAttachment = useCallback((attachmentId: string) => {
    setSelectedAttachments((current) => current.filter((item) => item.id !== attachmentId));
  }, []);

  const sendBulkAttachment = useCallback(async () => {
    if (!open || recipientSummary == null || !canSend || sending) return;

    setSending(true);
    setFeedback(null);
    setProgressLabel(copy.uploading);

    try {
      const attachmentDocumentIds = await resolveSelectedAttachmentDocumentIds(
        selectedAttachments,
        uploadScope
      );

      const result = await bulkSendSubprojectCommunications({
        parentProjectName: options.parentProjectName,
        subject,
        message,
        attachmentDocumentIds,
        recipients: recipientSummary.recipients,
        onProgress: (rows, currentIndex, total) => {
          setDeliveryRows(rows);
          setProgressLabel(copy.sendingProgress(currentIndex, total));
        },
      });

      setDeliveryRows(result.rows);
      setCompleted(true);
      setFeedback({
        kind: 'complete',
        message: copy.completionSummary(result.sentCount, result.failedCount, result.skippedCount),
      });
      options.onComplete?.(result);
    } catch {
      setFeedback({ kind: 'error', message: copy.sendFailed });
    } finally {
      setSending(false);
      setProgressLabel(null);
    }
  }, [
    canSend,
    copy.completionSummary,
    copy.sendFailed,
    copy.sendingProgress,
    copy.uploading,
    message,
    open,
    options,
    recipientSummary,
    selectedAttachments,
    sending,
    subject,
    uploadScope,
  ]);

  return {
    open,
    subject,
    setSubject,
    message,
    setMessage,
    selectedAttachments,
    addFiles,
    addExistingDocument,
    removeSelectedAttachment,
    recipientSummary,
    deliveryRows,
    sending,
    progressLabel,
    feedback,
    completed,
    canSend,
    readyCount,
    openBulkSendAttachmentDialog,
    closeDialog,
    sendBulkAttachment,
  };
}
