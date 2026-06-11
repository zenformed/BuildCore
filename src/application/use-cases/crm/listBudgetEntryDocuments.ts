import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmDocumentMetadata } from '@/domain/crm';
import type { ListBudgetEntryDocumentsInput } from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function listBudgetEntryDocuments(
  repositories: CrmRepositories,
  input: ListBudgetEntryDocumentsInput
): Promise<readonly CrmDocumentMetadata[]> {
  return resolveCrmRepositoryResult(repositories.documents.listByBudgetEntryId(input));
}
