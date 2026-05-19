import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmDocumentMetadata } from '@/domain/crm';
import type { ListWorkflowTaskDocumentsInput } from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function listWorkflowTaskDocuments(
  repositories: CrmRepositories,
  input: ListWorkflowTaskDocumentsInput
): Promise<readonly CrmDocumentMetadata[]> {
  return resolveCrmRepositoryResult(repositories.documents.listByWorkflowTaskId(input));
}
