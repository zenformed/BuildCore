import type {
  DocumentStoragePutInput,
  DocumentStorageSignedUrlInput,
  IDocumentStorageProvider,
} from '@/application/ports/storage/IDocumentStorageProvider';
import {
  createAppDocumentSignedDownloadUrl,
  deleteAppDocumentObject,
  putAppDocumentObject,
} from '@/infrastructure/coreApi/appDocumentStorageClient';

export type CoreDocumentStorageProviderContext = {
  readonly accessToken: string;
  readonly organizationId: string;
};

export class CoreDocumentStorageProvider implements IDocumentStorageProvider {
  constructor(private readonly ctx: CoreDocumentStorageProviderContext) {}

  async putObject(input: DocumentStoragePutInput): Promise<void> {
    const result = await putAppDocumentObject(this.ctx.accessToken, this.ctx.organizationId, {
      bucket: input.bucket,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      body: input.body,
    });
    if (!result.ok) {
      throw mapCoreStorageError(result.error);
    }
  }

  async deleteObject(input: { bucket: string; storageKey: string }): Promise<void> {
    const result = await deleteAppDocumentObject(this.ctx.accessToken, this.ctx.organizationId, {
      bucket: input.bucket,
      storageKey: input.storageKey,
    });
    if (!result.ok) {
      throw mapCoreStorageError(result.error);
    }
  }

  async createSignedDownloadUrl(input: DocumentStorageSignedUrlInput): Promise<string> {
    const result = await createAppDocumentSignedDownloadUrl(
      this.ctx.accessToken,
      this.ctx.organizationId,
      {
        bucket: input.bucket,
        storageKey: input.storageKey,
        expiresInSeconds: input.expiresInSeconds,
      }
    );
    if (!result.ok) {
      throw mapCoreStorageError(result.error);
    }
    return result.data.url;
  }
}

function mapCoreStorageError(error: { kind: string; status?: number; body?: unknown }): Error {
  if (error.kind === 'unconfigured') {
    return new Error('zenformed_core_unconfigured');
  }
  if (error.kind === 'http_error' && error.status === 413) {
    return new Error('payload_too_large');
  }
  if (error.kind === 'http_error' && error.status === 403) {
    return new Error('storage_forbidden');
  }
  if (error.kind === 'http_error' && error.status === 503) {
    return new Error('zenformed_core_storage_unavailable');
  }
  return new Error('document_storage_failed');
}
