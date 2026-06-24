import type { CrmDocumentMetadata } from '@/domain/crm';
import type { ExistingAttachmentOption } from '@/presentation/features/communications/sendAttachmentTypes';

export function mapCrmDocumentToExistingAttachmentOption(
  document: CrmDocumentMetadata
): ExistingAttachmentOption {
  return {
    crmDocumentId: document.id,
    fileName: document.name,
    mimeType: document.mimeType,
    kind: document.kind,
    sizeBytes: document.sizeBytes,
    uploadedAt: document.uploadedAt,
  };
}

export function mapCrmDocumentsToExistingAttachmentOptions(
  documents: readonly CrmDocumentMetadata[]
): ExistingAttachmentOption[] {
  return documents.map(mapCrmDocumentToExistingAttachmentOption);
}
