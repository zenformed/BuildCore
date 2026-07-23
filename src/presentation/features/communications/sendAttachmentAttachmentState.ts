import { validateBuildCoreUpload } from '@/domain/crm/buildCoreUploadPolicy';
import {
  performCrmDirectUploads,
  type CrmDirectUploadScope,
} from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import type {
  ExistingAttachmentOption,
  SelectedAttachment,
  SelectedExistingAttachment,
  SelectedNewAttachment,
} from '@/presentation/features/communications/sendAttachmentTypes';

export function createSelectedNewAttachment(file: File): SelectedNewAttachment {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    source: 'new',
    file,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  };
}

export function validateSelectedNewFiles(
  incoming: readonly File[]
): { readonly attachments: readonly SelectedNewAttachment[]; readonly errorMessage: string | null } {
  const next: SelectedNewAttachment[] = [];
  let errorMessage: string | null = null;

  for (const file of incoming) {
    const validation = validateBuildCoreUpload({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });
    if (!validation.ok) {
      errorMessage = validation.message;
      continue;
    }
    next.push(createSelectedNewAttachment(file));
  }

  return { attachments: next, errorMessage };
}

export function toSelectedExistingAttachment(
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

export async function resolveSelectedAttachmentDocumentIds(
  selectedAttachments: readonly SelectedAttachment[],
  uploadScope: CrmDirectUploadScope
): Promise<string[]> {
  const existingIds: string[] = [];
  const newAttachments: SelectedNewAttachment[] = [];

  for (const selected of selectedAttachments) {
    if (selected.source === 'existing') {
      existingIds.push(selected.crmDocumentId);
      continue;
    }
    newAttachments.push(selected);
  }

  if (newAttachments.length === 0) {
    return existingIds;
  }

  const result = await performCrmDirectUploads({
    files: newAttachments.map((attachment) => attachment.file),
    uploadScope,
  });

  if (result.failed.length > 0) {
    throw new Error(result.failed[0]?.message ?? 'Could not upload attachment.');
  }
  if (result.skipped.length > 0 && result.succeeded.length === 0) {
    throw new Error(result.skipped[0]?.message ?? 'Could not upload attachment.');
  }
  if (result.succeeded.length !== newAttachments.length) {
    throw new Error('Could not upload all attachments.');
  }

  return [...existingIds, ...result.succeeded.map((entry) => entry.documentId)];
}
