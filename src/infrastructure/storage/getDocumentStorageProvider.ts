import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import {
  CoreDocumentStorageProvider,
  type CoreDocumentStorageProviderContext,
} from '@/infrastructure/storage/core/CoreDocumentStorageProvider';
import { MockDocumentStorageProvider } from '@/infrastructure/storage/mock/MockDocumentStorageProvider';

export type DocumentStorageProviderContext = CoreDocumentStorageProviderContext;

export function getDocumentStorageProvider(
  ctx?: DocumentStorageProviderContext
): IDocumentStorageProvider {
  const source = getCrmDataSource();
  if (source !== 'api') {
    return new MockDocumentStorageProvider();
  }
  if (ctx == null || ctx.accessToken.trim() === '' || ctx.organizationId.trim() === '') {
    throw new Error('document_storage_context_required');
  }
  return new CoreDocumentStorageProvider(ctx);
}
