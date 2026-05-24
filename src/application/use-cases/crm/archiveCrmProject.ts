import type { CrmRepositories } from '@/application/ports/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function archiveCrmProject(
  repositories: CrmRepositories,
  slug: string
): Promise<boolean> {
  return resolveCrmRepositoryResult(repositories.projects.archive(slug));
}
