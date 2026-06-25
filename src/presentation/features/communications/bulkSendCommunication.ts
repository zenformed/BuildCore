import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { sendCommunication } from '@/infrastructure/crm/api/sendCommunication';
import { BUILDCORE_GENERIC_ATTACHMENT_TEMPLATE_KEY } from '@/presentation/features/communications/sendAttachmentTypes';
import type { BulkSubprojectSendRecipient } from '@/presentation/features/communications/subprojectBulkSendRecipients';

export type BulkSendDeliveryStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

export type BulkSendDeliveryRow = BulkSubprojectSendRecipient & {
  readonly deliveryStatus: BulkSendDeliveryStatus;
  readonly errorMessage?: string;
};

export type BulkSendCommunicationInput = {
  readonly parentProjectName: string;
  readonly subject: string;
  readonly message: string;
  readonly attachmentDocumentIds: readonly string[];
  readonly recipients: readonly BulkSubprojectSendRecipient[];
  readonly onProgress?: (rows: readonly BulkSendDeliveryRow[], currentIndex: number, total: number) => void;
};

export type BulkSendCommunicationResult = {
  readonly rows: readonly BulkSendDeliveryRow[];
  readonly sentCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
};

export async function bulkSendSubprojectCommunications(
  input: BulkSendCommunicationInput
): Promise<BulkSendCommunicationResult> {
  const readyRecipients = input.recipients.filter((recipient) => recipient.status === 'ready');
  const skippedRecipients = input.recipients.filter((recipient) => recipient.status !== 'ready');

  const rows: BulkSendDeliveryRow[] = [
    ...skippedRecipients.map((recipient) => ({
      ...recipient,
      deliveryStatus: 'skipped' as const,
    })),
    ...readyRecipients.map((recipient) => ({
      ...recipient,
      deliveryStatus: 'pending' as const,
    })),
  ];

  let sentCount = 0;
  let failedCount = 0;
  const skippedCount = skippedRecipients.length;

  for (let index = 0; index < readyRecipients.length; index += 1) {
    const recipient = readyRecipients[index]!;
    const rowIndex = rows.findIndex((row) => row.subprojectId === recipient.subprojectId);
    if (rowIndex >= 0) {
      rows[rowIndex] = { ...rows[rowIndex]!, deliveryStatus: 'sending' };
    }
    input.onProgress?.([...rows], index + 1, readyRecipients.length);

    try {
      await sendCommunication({
        templateKey: BUILDCORE_GENERIC_ATTACHMENT_TEMPLATE_KEY,
        channel: 'email',
        recipient: {
          email: recipient.email!,
          name: recipient.contactName,
          contactId: recipient.contactId,
          memberId: null,
        },
        entity: {
          type: 'subproject',
          id: recipient.subprojectId,
        },
        subject: input.subject.trim(),
        message: input.message.trim() || null,
        attachments: input.attachmentDocumentIds.map((crmDocumentId) => ({ crmDocumentId })),
        context: {
          projectName: input.parentProjectName,
          entityLabel: recipient.subprojectName,
        },
      });
      if (rowIndex >= 0) {
        rows[rowIndex] = { ...rows[rowIndex]!, deliveryStatus: 'sent' };
      }
      sentCount += 1;
    } catch (err) {
      const errorMessage =
        err instanceof CrmApiError && err.message.trim() ? err.message : 'Could not send the email.';
      if (rowIndex >= 0) {
        rows[rowIndex] = { ...rows[rowIndex]!, deliveryStatus: 'failed', errorMessage };
      }
      failedCount += 1;
    }

    input.onProgress?.([...rows], index + 1, readyRecipients.length);
  }

  return {
    rows,
    sentCount,
    failedCount,
    skippedCount,
  };
}

export function orderBulkSendCompletionRows(
  recipients: readonly BulkSubprojectSendRecipient[],
  deliveryRows: readonly BulkSendDeliveryRow[]
): readonly BulkSendDeliveryRow[] {
  const rowsBySubprojectId = new Map(
    deliveryRows.map((row) => [row.subprojectId, row] as const)
  );

  return recipients.map((recipient) => {
    const row = rowsBySubprojectId.get(recipient.subprojectId);
    if (row != null) return row;
    return {
      ...recipient,
      deliveryStatus: 'skipped' as const,
    };
  });
}

export function summarizeBulkSendDeliveryRows(rows: readonly BulkSendDeliveryRow[]): {
  readonly sentCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
} {
  return {
    sentCount: rows.filter((row) => row.deliveryStatus === 'sent').length,
    failedCount: rows.filter((row) => row.deliveryStatus === 'failed').length,
    skippedCount: rows.filter((row) => row.deliveryStatus === 'skipped').length,
  };
}
