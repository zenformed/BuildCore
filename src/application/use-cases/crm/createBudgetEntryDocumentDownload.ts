import type { CrmRepositories } from '@/application/ports/crm';
import type {
  BudgetEntryDocumentDownload,
  CreateBudgetEntryDocumentDownloadInput,
} from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function createBudgetEntryDocumentDownload(
  repositories: CrmRepositories,
  input: CreateBudgetEntryDocumentDownloadInput
): Promise<BudgetEntryDocumentDownload> {
  return resolveCrmRepositoryResult(repositories.documents.createBudgetEntryDownload(input));
}
