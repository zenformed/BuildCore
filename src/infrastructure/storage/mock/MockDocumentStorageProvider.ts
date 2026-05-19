import type {
  DocumentStoragePutInput,
  DocumentStorageSignedUrlInput,
  IDocumentStorageProvider,
} from '@/application/ports/storage/IDocumentStorageProvider';

const objectStore = new Map<string, { body: Uint8Array; mimeType: string }>();

function storageMapKey(bucket: string, storageKey: string): string {
  return `${bucket}::${storageKey}`;
}

export class MockDocumentStorageProvider implements IDocumentStorageProvider {
  async putObject(input: DocumentStoragePutInput): Promise<void> {
    objectStore.set(storageMapKey(input.bucket, input.storageKey), {
      body: input.body,
      mimeType: input.mimeType,
    });
  }

  async deleteObject(input: { bucket: string; storageKey: string }): Promise<void> {
    objectStore.delete(storageMapKey(input.bucket, input.storageKey));
  }

  async createSignedDownloadUrl(input: DocumentStorageSignedUrlInput): Promise<string> {
    const key = storageMapKey(input.bucket, input.storageKey);
    const entry = objectStore.get(key);
    if (!entry) {
      throw new Error('mock_document_not_found');
    }
    const blob = new Blob([entry.body], { type: entry.mimeType });
    return URL.createObjectURL(blob);
  }
}
