import type { CrmRepositories } from '@/application/ports/crm';
import type { DeleteProjectMediaDocumentInput } from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function deleteProjectMediaDocument(
  repositories: CrmRepositories,
  input: DeleteProjectMediaDocumentInput
): Promise<void> {
  return resolveCrmRepositoryResult(repositories.documents.deleteProjectMedia(input));
}
