/** BuildCore launch upload policy — keep in sync with ZenformedCore buildCoreUploadPolicy.ts */

export type BuildCoreUploadAssetKind = 'image' | 'video' | 'document';

export const BUILDCORE_UPLOAD_MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const BUILDCORE_UPLOAD_MAX_VIDEO_BYTES = 250 * 1024 * 1024;
export const BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

export const BUILDCORE_UPLOAD_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
] as const;

export const BUILDCORE_UPLOAD_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'] as const;

export const BUILDCORE_UPLOAD_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.rtf',
] as const;

export const BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS = [
  ...BUILDCORE_UPLOAD_IMAGE_EXTENSIONS,
  ...BUILDCORE_UPLOAD_VIDEO_EXTENSIONS,
  ...BUILDCORE_UPLOAD_DOCUMENT_EXTENSIONS,
] as const;

export type BuildCoreUploadValidationResult =
  | { ok: true; assetKind: BuildCoreUploadAssetKind; maxBytes: number }
  | { ok: false; message: string };

export function extensionFromUploadFileName(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0) return '';
  return fileName.slice(idx).toLowerCase();
}

export function classifyBuildCoreUploadAsset(
  fileName: string,
  mimeType: string
): BuildCoreUploadAssetKind | null {
  const ext = extensionFromUploadFileName(fileName);
  const mime = mimeType.trim().toLowerCase();

  if (
    mime.startsWith('image/') ||
    BUILDCORE_UPLOAD_IMAGE_EXTENSIONS.includes(ext as (typeof BUILDCORE_UPLOAD_IMAGE_EXTENSIONS)[number])
  ) {
    return 'image';
  }
  if (
    mime.startsWith('video/') ||
    BUILDCORE_UPLOAD_VIDEO_EXTENSIONS.includes(ext as (typeof BUILDCORE_UPLOAD_VIDEO_EXTENSIONS)[number])
  ) {
    return 'video';
  }
  if (
    BUILDCORE_UPLOAD_DOCUMENT_EXTENSIONS.includes(
      ext as (typeof BUILDCORE_UPLOAD_DOCUMENT_EXTENSIONS)[number]
    )
  ) {
    return 'document';
  }
  return null;
}

export function inferBuildCoreDocumentType(
  fileName: string,
  mimeType: string
): 'photo' | 'video' | 'other' {
  const kind = classifyBuildCoreUploadAsset(fileName, mimeType);
  if (kind === 'image') return 'photo';
  if (kind === 'video') return 'video';
  return 'other';
}

export function validateBuildCoreUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): BuildCoreUploadValidationResult {
  const fileName = input.fileName.trim();
  if (!fileName) return { ok: false, message: 'File name is required.' };
  if (input.sizeBytes <= 0) return { ok: false, message: 'File is empty.' };

  const assetKind = classifyBuildCoreUploadAsset(fileName, input.mimeType);
  if (assetKind == null) {
    return { ok: false, message: 'This file type is not supported.' };
  }

  const maxBytes =
    assetKind === 'image'
      ? BUILDCORE_UPLOAD_MAX_IMAGE_BYTES
      : assetKind === 'video'
        ? BUILDCORE_UPLOAD_MAX_VIDEO_BYTES
        : BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES;

  if (input.sizeBytes > maxBytes) {
    const maxMb = Math.floor(maxBytes / (1024 * 1024));
    return { ok: false, message: `File must be ${maxMb} MB or smaller.` };
  }

  return { ok: true, assetKind, maxBytes };
}

export function buildSafeUploadFileName(originalFileName: string): string {
  const trimmed = originalFileName.trim() || 'file';
  const ext = extensionFromUploadFileName(trimmed);
  const base = trimmed.slice(0, trimmed.length - ext.length);
  const safeBase = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'file';
  const safeExt = ext.replace(/[^a-zA-Z0-9.]+/g, '');
  return `${safeBase}${safeExt}`.slice(0, 160) || 'file';
}

export function buildProjectMediaStorageKey(input: {
  organizationId: string;
  projectId: string;
  documentId: string;
  safeFileName: string;
}): string {
  return [
    'buildcore',
    input.organizationId,
    'projects',
    input.projectId,
    'media',
    `${input.documentId}-${input.safeFileName}`,
  ].join('/');
}
