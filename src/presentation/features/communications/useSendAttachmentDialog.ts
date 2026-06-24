'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { validateBuildCoreUpload } from '@/domain/crm/buildCoreUploadPolicy';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { sendCommunication } from '@/infrastructure/crm/api/sendCommunication';
import { performCrmDirectUpload } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  communicationRecipientOptionToSendRecipient,
  findCommunicationRecipientOption,
} from '@/presentation/features/communications/communicationRecipientTypes';
import type { CommunicationRecipientOption } from '@/presentation/features/communications/communicationRecipientTypes';
import {
  BUILDCORE_GENERIC_ATTACHMENT_TEMPLATE_KEY,
  isExistingAttachmentSelected,
  isSendAttachmentFormValid,
  type ExistingAttachmentOption,
  type SelectedAttachment,
  type SelectedExistingAttachment,
  type SelectedNewAttachment,
  type SendAttachmentDialogContext,
} from '@/presentation/features/communications/sendAttachmentTypes';

export type SendAttachmentDialogFeedback = {
  readonly kind: 'success' | 'error';
  readonly message: string;
};

export type UseSendAttachmentDialogOptions = {
  readonly onSent?: () => void;
  readonly onError?: (message: string) => void;
};

function createSelectedNewAttachment(file: File): SelectedNewAttachment {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    source: 'new',
    file,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  };
}

function toSelectedExistingAttachment(
  document: ExistingAttachmentOption
): SelectedExistingAttachment {
  return {
    id: `existing-${document.crmDocumentId}`,
    source: 'existing',
    crmDocumentId: document.crmDocumentId,
    fileName: document.fileName,
    mimeType: document.mimeType,
    kind: document.kind,
    sizeBytes: document.sizeBytes,
  };
}

export function useSendAttachmentDialog(options: UseSendAttachmentDialogOptions = {}) {
  const copy = content.projectDetail.communications.sendAttachment;
  const [dialogContext, setDialogContext] = useState<SendAttachmentDialogContext | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<readonly SelectedAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<SendAttachmentDialogFeedback | null>(null);

  const recipientOptions = dialogContext?.recipientOptions ?? [];

  const selectedRecipient = useMemo((): CommunicationRecipientOption | null => {
    if (dialogContext == null || selectedRecipientId == null) return null;
    return findCommunicationRecipientOption(dialogContext.recipientOptions, selectedRecipientId);
  }, [dialogContext, selectedRecipientId]);

  const closeDialog = useCallback(() => {
    if (sending) return;
    setDialogContext(null);
    setSelectedRecipientId(null);
    setSubject('');
    setMessage('');
    setSelectedAttachments([]);
    setFeedback(null);
  }, [sending]);

  const openSendAttachmentDialog = useCallback((context: SendAttachmentDialogContext) => {
    setDialogContext(context);
    setSelectedRecipientId(context.defaultRecipientId);
    setSubject(context.defaultSubject?.trim() ?? '');
    setMessage('');
    setSelectedAttachments([]);
    setFeedback(null);
  }, []);

  const onRecipientChange = useCallback((recipientId: string) => {
    setSelectedRecipientId(recipientId);
  }, []);

  const addFiles = useCallback((incoming: readonly File[]) => {
    const next: SelectedNewAttachment[] = [];
    for (const file of incoming) {
      const validation = validateBuildCoreUpload({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      if (!validation.ok) {
        setFeedback({ kind: 'error', message: validation.message });
        continue;
      }
      next.push(createSelectedNewAttachment(file));
    }
    if (next.length === 0) return;
    setFeedback(null);
    setSelectedAttachments((current) => [...current, ...next]);
  }, []);

  const addExistingDocument = useCallback((document: ExistingAttachmentOption) => {
    setSelectedAttachments((current) => {
      if (isExistingAttachmentSelected(current, document.crmDocumentId)) {
        return current;
      }
      setFeedback(null);
      return [...current, toSelectedExistingAttachment(document)];
    });
  }, []);

  const removeSelectedAttachment = useCallback((attachmentId: string) => {
    setSelectedAttachments((current) => current.filter((item) => item.id !== attachmentId));
  }, []);

  const canSend = useMemo(() => {
    if (dialogContext == null || selectedRecipient == null || sending) return false;
    return isSendAttachmentFormValid({
      recipientEmail: selectedRecipient.email,
      subject,
      message,
      selectedAttachments,
    });
  }, [dialogContext, message, selectedAttachments, selectedRecipient, sending, subject]);

  const sendAttachment = useCallback(async () => {
    if (dialogContext == null || selectedRecipient == null || !canSend || sending) return;

    const recipient = communicationRecipientOptionToSendRecipient(selectedRecipient);

    setSending(true);
    setFeedback(null);
    try {
      const attachmentDocumentIds: string[] = [];
      for (const selected of selectedAttachments) {
        if (selected.source === 'existing') {
          attachmentDocumentIds.push(selected.crmDocumentId);
          continue;
        }
        const prepared = await performCrmDirectUpload(selected.file, dialogContext.uploadScope);
        attachmentDocumentIds.push(prepared.documentId);
      }

      await sendCommunication({
        templateKey: BUILDCORE_GENERIC_ATTACHMENT_TEMPLATE_KEY,
        channel: 'email',
        recipient: {
          email: recipient.email,
          name: recipient.name,
          contactId: recipient.contactId ?? null,
          memberId: recipient.memberId ?? null,
        },
        entity: dialogContext.entity,
        subject: subject.trim(),
        message: message.trim() || null,
        attachments: attachmentDocumentIds.map((crmDocumentId) => ({ crmDocumentId })),
        context: dialogContext.context,
      });

      setFeedback({ kind: 'success', message: copy.success });
      options.onSent?.();
    } catch (err) {
      const messageText =
        err instanceof CrmApiError && err.message.trim() ? err.message : copy.sendFailed;
      setFeedback({ kind: 'error', message: messageText });
      options.onError?.(messageText);
    } finally {
      setSending(false);
    }
  }, [
    canSend,
    copy.sendFailed,
    copy.success,
    dialogContext,
    message,
    options,
    selectedAttachments,
    selectedRecipient,
    sending,
    subject,
  ]);

  useEffect(() => {
    if (feedback?.kind !== 'success') return;
    const timer = setTimeout(() => closeDialog(), 2500);
    return () => clearTimeout(timer);
  }, [closeDialog, feedback]);

  return {
    dialogContext,
    recipientOptions,
    selectedRecipient,
    onRecipientChange,
    subject,
    setSubject,
    message,
    setMessage,
    selectedAttachments,
    addFiles,
    addExistingDocument,
    removeSelectedAttachment,
    sending,
    feedback,
    canSend,
    openSendAttachmentDialog,
    closeDialog,
    sendAttachment,
  };
}
