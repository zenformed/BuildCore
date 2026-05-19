import type { CrmRepositories } from '@/application/ports/crm';
import type { DeleteWorkflowTaskDocumentInput } from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function deleteWorkflowTaskDocument(
  repositories: CrmRepositories,
  input: DeleteWorkflowTaskDocumentInput
): Promise<void> {
  return resolveCrmRepositoryResult(repositories.documents.delete(input));
}
