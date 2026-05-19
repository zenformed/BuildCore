import type { CrmRepositories } from '@/application/ports/crm';
import type {
  UploadBudgetEntryDocumentInput,
  UploadBudgetEntryDocumentResult,
} from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function uploadBudgetEntryDocument(
  repositories: CrmRepositories,
  input: UploadBudgetEntryDocumentInput
): Promise<UploadBudgetEntryDocumentResult> {
  return resolveCrmRepositoryResult(repositories.documents.uploadBudgetEntry(input));
}
