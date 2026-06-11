import type { CrmRepositories } from '@/application/ports/crm';
import type {
  CreateProjectMediaDocumentDownloadInput,
  ProjectMediaDocumentDownload,
} from '@/domain/crm/documentMutations';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function createProjectMediaDocumentDownload(
  repositories: CrmRepositories,
  input: CreateProjectMediaDocumentDownloadInput
): Promise<ProjectMediaDocumentDownload> {
  return resolveCrmRepositoryResult(repositories.documents.createProjectMediaDownload(input));
}
