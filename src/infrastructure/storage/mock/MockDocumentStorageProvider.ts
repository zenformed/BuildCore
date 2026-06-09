import type {
  DocumentStoragePutInput,
  DocumentStorageSignedUrlInput,
  IDocumentStorageProvider,
} from '@/application/ports/storage/IDocumentStorageProvider';
import {
  deleteMockStorageObject,
  readMockStorageObject,
  setMockStorageObject,
} from './mockStorageObjectStore';

export class MockDocumentStorageProvider implements IDocumentStorageProvider {
  async putObject(input: DocumentStoragePutInput): Promise<void> {
    setMockStorageObject(input);
  }

  async deleteObject(input: { bucket: string; storageKey: string }): Promise<void> {
    deleteMockStorageObject(input.bucket, input.storageKey);
  }

  async createSignedDownloadUrl(input: DocumentStorageSignedUrlInput): Promise<string> {
    const entry = readMockStorageObject(input.bucket, input.storageKey);
    if (entry == null) {
      throw new Error('mock_document_not_found');
    }
    const blob = new Blob([entry.body], { type: entry.mimeType });
    return URL.createObjectURL(blob);
  }
}

export { readMockStorageObject };
