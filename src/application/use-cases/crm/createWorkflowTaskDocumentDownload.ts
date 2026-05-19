import type { CrmRepositories } from '@/application/ports/crm';
import type {
  CreateWorkflowTaskDocumentDownloadInput,
  WorkflowTaskDocumentDownload,
} from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function createWorkflowTaskDocumentDownload(
  repositories: CrmRepositories,
  input: CreateWorkflowTaskDocumentDownloadInput
): Promise<WorkflowTaskDocumentDownload> {
  return resolveCrmRepositoryResult(repositories.documents.createDownload(input));
}
