/**
 * Helpers for gallery tile / preview media classification and labels.
 */

import type { CrmDocumentMetadata } from '@/domain/crm';
import { extensionFromFileName } from '@/domain/crm/documentUpload';
import { DOCUMENT_GALLERY_ASPECT } from '@/domain/crm/documentGalleryLayout';
import { inferWorkflowDocumentFileIconType } from '@/presentation/features/crmProjectDetail/workflowDocumentFileIconType';

export function isCrmDocumentImage(fileName: string, mimeType: string): boolean {
  return inferWorkflowDocumentFileIconType(fileName, mimeType) === 'image';
}

export function isCrmDocumentVideo(fileName: string, mimeType: string): boolean {
  const mime = mimeType.trim().toLowerCase();
  if (mime.startsWith('video/')) return true;
  const ext = extensionFromFileName(fileName);
  return ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'].includes(ext);
}

export function isCrmDocumentPdf(fileName: string, mimeType: string): boolean {
  return inferWorkflowDocumentFileIconType(fileName, mimeType) === 'pdf';
}

/** Short extension label for document fallback tiles (PDF, DOCX, CSV…). */
export function formatCrmDocumentExtensionBadge(fileName: string, mimeType: string): string {
  const ext = extensionFromFileName(fileName).replace(/^\./, '').toUpperCase();
  if (ext) return ext;
  if (isCrmDocumentPdf(fileName, mimeType)) return 'PDF';
  const icon = inferWorkflowDocumentFileIconType(fileName, mimeType);
  if (icon === 'word') return 'DOC';
  if (icon === 'sheet') return 'XLS';
  if (icon === 'presentation') return 'PPT';
  if (icon === 'archive') return 'ZIP';
  if (icon === 'text') return 'TXT';
  return 'FILE';
}

/** Friendly type for metadata sidebar: "PNG image", "PDF document", etc. */
export function formatCrmDocumentFriendlyType(fileName: string, mimeType: string): string {
  const mime = mimeType.trim().toLowerCase();
  const ext = extensionFromFileName(fileName).replace(/^\./, '').toUpperCase();

  if (isCrmDocumentImage(fileName, mimeType)) {
    if (mime === 'image/jpeg' || ext === 'JPG' || ext === 'JPEG') return 'JPEG image';
    if (mime === 'image/png' || ext === 'PNG') return 'PNG image';
    if (mime === 'image/webp' || ext === 'WEBP') return 'WEBP image';
    if (mime === 'image/gif' || ext === 'GIF') return 'GIF image';
    return ext ? `${ext} image` : 'Image';
  }
  if (isCrmDocumentVideo(fileName, mimeType)) {
    if (mime === 'video/mp4' || ext === 'MP4') return 'MP4 video';
    return ext ? `${ext} video` : 'Video';
  }
  if (isCrmDocumentPdf(fileName, mimeType)) return 'PDF document';

  const icon = inferWorkflowDocumentFileIconType(fileName, mimeType);
  if (icon === 'word') return 'Word document';
  if (icon === 'sheet') return 'Spreadsheet';
  if (icon === 'presentation') return 'Presentation';
  if (icon === 'archive') return 'Archive';
  if (icon === 'text') return 'Text file';
  if (mime) return mime;
  return ext || 'File';
}

export function documentPreviewBlobCacheKey(documentId: string): string {
  return `crm-document-preview:${documentId}`;
}

const learnedAspectByDocumentId = new Map<string, number>();

export function peekLearnedDocumentGalleryAspect(documentId: string): number | undefined {
  return learnedAspectByDocumentId.get(documentId);
}

export function rememberDocumentGalleryAspect(documentId: string, aspectRatio: number): void {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return;
  learnedAspectByDocumentId.set(documentId, aspectRatio);
}

/** Initial aspect before thumbnail natural dimensions are known. */
export function resolveDocumentGalleryAspectRatio(doc: CrmDocumentMetadata): number {
  const learned = learnedAspectByDocumentId.get(doc.id);
  if (learned != null) return learned;

  if (isCrmDocumentImage(doc.name, doc.mimeType)) {
    return DOCUMENT_GALLERY_ASPECT.imageFallback;
  }
  if (isCrmDocumentVideo(doc.name, doc.mimeType)) {
    return DOCUMENT_GALLERY_ASPECT.videoFallback;
  }
  return DOCUMENT_GALLERY_ASPECT.documentFallback;
}
