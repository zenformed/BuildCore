import type { CrmRepositories } from '@/application/ports/crm';
import type {
  UploadWorkflowTaskDocumentInput,
  UploadWorkflowTaskDocumentResult,
} from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function uploadWorkflowTaskDocument(
  repositories: CrmRepositories,
  input: UploadWorkflowTaskDocumentInput
): Promise<UploadWorkflowTaskDocumentResult> {
  return resolveCrmRepositoryResult(repositories.documents.upload(input));
}
