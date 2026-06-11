import { NextResponse } from 'next/server';
import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { BUILDCORE_DOCUMENT_STORAGE_BUCKET } from '@/domain/crm/documentUpload';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import type { DbCrmDocumentRow } from '@/infrastructure/crm/mappers/mapCrmFromDb';

export type CrmDocumentAttachmentPayload = {
  readonly fileName: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
};

export function buildContentDispositionAttachment(fileName: string): string {
  const trimmed = fileName.trim() || 'download';
  const asciiFallback = trimmed.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'download';
  const encoded = encodeURIComponent(trimmed);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function loadCrmDocumentAttachmentFromRow(
  storage: IDocumentStorageProvider,
  row: Pick<
    DbCrmDocumentRow,
    'file_name' | 'mime_type' | 'storage_key' | 'storage_path' | 'storage_bucket'
  >
): Promise<CrmDocumentAttachmentPayload> {
  const storageKey = row.storage_key ?? row.storage_path;
  if (!storageKey) {
    throw new CrmDocumentServiceError('not_found', 'Document file is unavailable');
  }

  const bucket = row.storage_bucket ?? BUILDCORE_DOCUMENT_STORAGE_BUCKET;
  const signedUrl = await storage.createSignedDownloadUrl({ bucket, storageKey });
  const response = await fetch(signedUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new CrmDocumentServiceError('not_found', 'Document file is unavailable');
  }

  return {
    fileName: row.file_name,
    mimeType: row.mime_type?.trim() || 'application/octet-stream',
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

export function crmDocumentAttachmentNextResponse(payload: CrmDocumentAttachmentPayload): NextResponse {
  return new NextResponse(payload.buffer, {
    status: 200,
    headers: {
      'Content-Type': payload.mimeType,
      'Content-Disposition': buildContentDispositionAttachment(payload.fileName),
      'Cache-Control': 'private, no-store',
      'Content-Length': String(payload.buffer.byteLength),
    },
  });
}
