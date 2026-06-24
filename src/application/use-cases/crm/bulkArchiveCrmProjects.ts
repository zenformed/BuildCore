import type { CrmRepositories } from '@/application/ports/crm';
import type { BulkArchiveCrmProjectsResult } from '@/domain/crm/bulkArchiveProjects';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function bulkArchiveCrmProjects(
  repositories: CrmRepositories,
  slugs: readonly string[]
): Promise<BulkArchiveCrmProjectsResult> {
  return resolveCrmRepositoryResult(repositories.projects.bulkArchive(slugs));
}
