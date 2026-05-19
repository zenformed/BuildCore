import type { CrmRepositories } from '@/application/ports/crm';
import type { DeleteBudgetEntryDocumentInput } from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function deleteBudgetEntryDocument(
  repositories: CrmRepositories,
  input: DeleteBudgetEntryDocumentInput
): Promise<void> {
  return resolveCrmRepositoryResult(repositories.documents.deleteBudgetEntry(input));
}
