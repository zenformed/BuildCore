'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { sendCommunication } from '@/infrastructure/crm/api/sendCommunication';
import { DEMO_COMMUNICATION_SIMULATED_MESSAGE } from '@/infrastructure/demo/demoSafetyPolicy';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  communicationRecipientOptionToSendRecipient,
  findCommunicationRecipientOption,
} from '@/presentation/features/communications/communicationRecipientTypes';
import type { CommunicationRecipientOption } from '@/presentation/features/communications/communicationRecipientTypes';
import {
  resolveSelectedAttachmentDocumentIds,
  toSelectedExistingAttachment,
  validateSelectedNewFiles,
} from '@/presentation/features/communications/sendAttachmentAttachmentState';
import {
  BUILDCORE_GENERIC_ATTACHMENT_TEMPLATE_KEY,
  isExistingAttachmentSelected,
  isSendAttachmentFormValid,
  type ExistingAttachmentOption,
  type SelectedAttachment,
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
    const { attachments, errorMessage } = validateSelectedNewFiles(incoming);
    if (errorMessage != null) {
      setFeedback({ kind: 'error', message: errorMessage });
    }
    if (attachments.length === 0) return;
    setFeedback(null);
    setSelectedAttachments((current) => [...current, ...attachments]);
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
      const attachmentDocumentIds = await resolveSelectedAttachmentDocumentIds(
        selectedAttachments,
        dialogContext.uploadScope
      );

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

      setFeedback({
        kind: 'success',
        message: isDemoRuntimeClient() ? DEMO_COMMUNICATION_SIMULATED_MESSAGE : copy.success,
      });
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
