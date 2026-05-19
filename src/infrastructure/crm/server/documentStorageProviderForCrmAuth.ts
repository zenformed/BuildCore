import type { IDocumentStorageProvider } from '@/application/ports/storage/IDocumentStorageProvider';
import type { CrmApiAuthContext } from './crmApiRouteAuth';
import { getDocumentStorageProvider } from '@/infrastructure/storage/getDocumentStorageProvider';

export function getDocumentStorageProviderForCrmAuth(
  context: CrmApiAuthContext
): IDocumentStorageProvider {
  const accessToken = context.authHeader.replace(/^Bearer\s+/i, '').trim();
  return getDocumentStorageProvider({
    accessToken,
    organizationId: context.organizationId,
  });
}
