export type DocumentStoragePutInput = {
  readonly bucket: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly body: Uint8Array;
};

export type DocumentStorageSignedUrlInput = {
  readonly bucket: string;
  readonly storageKey: string;
  readonly expiresInSeconds?: number;
};

export interface IDocumentStorageProvider {
  putObject(input: DocumentStoragePutInput): Promise<void>;
  deleteObject(input: { bucket: string; storageKey: string }): Promise<void>;
  createSignedDownloadUrl(input: DocumentStorageSignedUrlInput): Promise<string>;
}
