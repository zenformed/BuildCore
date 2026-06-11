/** Legacy document upload constants — prefer buildCoreUploadPolicy for validation. */

import {
  BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS,
  BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES,
  validateBuildCoreUpload,
} from './buildCoreUploadPolicy';

export const BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES = BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES;

export const BUILDCORE_DOCUMENT_STORAGE_BUCKET = 'buildcore-documents';

export const BUILDCORE_DOCUMENT_STORAGE_PROVIDER = 'supabase' as const;

export type BuildcoreDocumentStorageProviderId = typeof BUILDCORE_DOCUMENT_STORAGE_PROVIDER;

/** @deprecated Use BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS from buildCoreUploadPolicy. */
export const BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS = BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS;

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
  return BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS.includes(
    ext as (typeof BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS)[number]
  );
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

  const result = validateBuildCoreUpload(input);
  if (!result.ok) {
    const code: DocumentUploadValidationCode = result.message.includes('MB or smaller')
      ? 'FILE_TOO_LARGE'
      : 'INVALID_FILE_TYPE';
    return { ok: false, code, message: result.message };
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

export function buildBudgetEntryDocumentStorageKey(input: {
  organizationId: string;
  projectId: string;
  budgetEntryId: string;
  documentId: string;
  safeFileName: string;
}): string {
  return [
    'buildcore',
    input.organizationId,
    'projects',
    input.projectId,
    'budget',
    input.budgetEntryId,
    `${input.documentId}-${input.safeFileName}`,
  ].join('/');
}

/** Internal analytics/billing code — launch mode uses track-only storage enforcement. */
export const STORAGE_LIMIT_EXCEEDED_CODE = 'STORAGE_LIMIT_EXCEEDED';

export const STORAGE_LIMIT_EXCEEDED_MESSAGE =
  'Storage limit reached. Contact support if you need assistance.';
