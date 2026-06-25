import { validateBuildCoreUpload } from '@/domain/crm/buildCoreUploadPolicy';
import { performCrmDirectUpload, type CrmDirectUploadScope } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
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
  const attachmentDocumentIds: string[] = [];
  for (const selected of selectedAttachments) {
    if (selected.source === 'existing') {
      attachmentDocumentIds.push(selected.crmDocumentId);
      continue;
    }
    const prepared = await performCrmDirectUpload(selected.file, uploadScope);
    attachmentDocumentIds.push(prepared.documentId);
  }
  return attachmentDocumentIds;
}
