import type { DocumentStoragePutInput } from '@/application/ports/storage/IDocumentStorageProvider';

const objectStore = new Map<string, { body: Uint8Array; mimeType: string }>();

function storageMapKey(bucket: string, storageKey: string): string {
  return `${bucket}::${storageKey}`;
}

export function setMockStorageObject(input: DocumentStoragePutInput): void {
  objectStore.set(storageMapKey(input.bucket, input.storageKey), {
    body: input.body,
    mimeType: input.mimeType,
  });
}

export function readMockStorageObject(
  bucket: string,
  storageKey: string
): { body: Buffer; mimeType: string } | null {
  const entry = objectStore.get(storageMapKey(bucket, storageKey));
  if (entry == null) return null;
  return {
    body: Buffer.from(entry.body),
    mimeType: entry.mimeType,
  };
}

export function deleteMockStorageObject(bucket: string, storageKey: string): void {
  objectStore.delete(storageMapKey(bucket, storageKey));
}
