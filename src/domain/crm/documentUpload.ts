/** Maximum workflow task document upload size (10 MiB). */
export const BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

export const BUILDCORE_DOCUMENT_STORAGE_BUCKET = 'buildcore-documents';

export const BUILDCORE_DOCUMENT_STORAGE_PROVIDER = 'supabase' as const;

export type BuildcoreDocumentStorageProviderId = typeof BUILDCORE_DOCUMENT_STORAGE_PROVIDER;

export const BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.rtf',
  '.odt',
  '.ods',
  '.ppt',
  '.pptx',
] as const;

const BLOCKED_MIME_PREFIXES = ['image/'] as const;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream',
]);

export type DocumentUploadValidationCode =
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE';

export type DocumentUploadValidationResult =
  | { ok: true }
  | { ok: false; code: DocumentUploadValidationCode; message: string };

export function extensionFromFileName(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0) return '';
  return fileName.slice(idx).toLowerCase();
}

export function isAllowedDocumentExtension(fileName: string): boolean {
  const ext = extensionFromFileName(fileName);
  return BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS.includes(
    ext as (typeof BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS)[number]
  );
}

export function isBlockedDocumentMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  return BLOCKED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isAllowedDocumentMimeType(mimeType: string, fileName: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized) return isAllowedDocumentExtension(fileName);
  if (isBlockedDocumentMimeType(normalized)) return false;
  if (ALLOWED_MIME_TYPES.has(normalized)) return true;
  return isAllowedDocumentExtension(fileName);
}

export function validateWorkflowTaskDocumentUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): DocumentUploadValidationResult {
  const fileName = input.fileName.trim();
  if (!fileName) {
    return { ok: false, code: 'EMPTY_FILE', message: 'File name is required.' };
  }
  if (input.sizeBytes <= 0) {
    return { ok: false, code: 'EMPTY_FILE', message: 'File is empty.' };
  }
  if (input.sizeBytes > BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES) {
    return {
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: `File must be ${Math.floor(BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`,
    };
  }
  if (!isAllowedDocumentMimeType(input.mimeType, fileName)) {
    return {
      ok: false,
      code: 'INVALID_FILE_TYPE',
      message: 'Images are not allowed. Upload office or document files only.',
    };
  }
  return { ok: true };
}

export function buildSafeDocumentFileName(originalFileName: string): string {
  const trimmed = originalFileName.trim() || 'document';
  const ext = extensionFromFileName(trimmed);
  const base = trimmed.slice(0, trimmed.length - ext.length);
  const safeBase = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'document';
  const safeExt = ext.replace(/[^a-zA-Z0-9.]+/g, '');
  const combined = `${safeBase}${safeExt}`.slice(0, 160);
  return combined || 'document';
}

export function buildWorkflowTaskDocumentStorageKey(input: {
  organizationId: string;
  projectId: string;
  workflowTaskId: string;
  documentId: string;
  safeFileName: string;
}): string {
  return [
    'buildcore',
    input.organizationId,
    'projects',
    input.projectId,
    'tasks',
    input.workflowTaskId,
    `${input.documentId}-${input.safeFileName}`,
  ].join('/');
}

export const STORAGE_LIMIT_EXCEEDED_CODE = 'STORAGE_LIMIT_EXCEEDED';

export const STORAGE_LIMIT_EXCEEDED_MESSAGE =
  'You have run out of document storage. Upgrade for more storage.';
