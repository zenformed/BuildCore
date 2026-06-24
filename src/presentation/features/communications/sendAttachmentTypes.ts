import type { CrmDirectUploadScope } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import type { CommunicationRecipientOption } from '@/presentation/features/communications/communicationRecipientTypes';

export type { CommunicationRecipientOption, SendAttachmentRecipient } from '@/presentation/features/communications/communicationRecipientTypes';

export type SendAttachmentEntityType =
  | 'workflow_task'
  | 'payment'
  | 'budget_entry'
  | 'project'
  | 'subproject';

/** Document already stored on the item and available to attach without re-upload. */
export type ExistingAttachmentOption = {
  readonly crmDocumentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly kind: string;
  readonly sizeBytes: number;
  readonly uploadedAt: string;
};

export type SelectedExistingAttachment = {
  readonly id: string;
  readonly source: 'existing';
  readonly crmDocumentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly kind: string;
  readonly sizeBytes: number;
};

export type SelectedNewAttachment = {
  readonly id: string;
  readonly source: 'new';
  readonly file: File;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
};

export type SelectedAttachment = SelectedExistingAttachment | SelectedNewAttachment;

export type SendAttachmentDialogContext = {
  readonly recipientOptions: readonly CommunicationRecipientOption[];
  readonly defaultRecipientId: string;
  readonly entity: {
    readonly type: SendAttachmentEntityType;
    readonly id: string;
  };
  readonly context: {
    readonly projectName: string;
    readonly entityLabel: string;
  };
  readonly uploadScope: CrmDirectUploadScope;
  readonly defaultSubject?: string;
  readonly existingDocuments: readonly ExistingAttachmentOption[];
};

export const BUILDCORE_GENERIC_ATTACHMENT_TEMPLATE_KEY = 'buildcore.generic_attachment';

export function isSendAttachmentFormValid(input: {
  readonly recipientEmail: string;
  readonly subject: string;
  readonly message: string;
  readonly selectedAttachments: readonly SelectedAttachment[];
}): boolean {
  const email = input.recipientEmail.trim();
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (email.length === 0 || subject.length === 0) {
    return false;
  }
  return message.length > 0 || input.selectedAttachments.length > 0;
}

export function isExistingAttachmentSelected(
  selectedAttachments: readonly SelectedAttachment[],
  crmDocumentId: string
): boolean {
  return selectedAttachments.some(
    (attachment) =>
      attachment.source === 'existing' && attachment.crmDocumentId === crmDocumentId
  );
}
