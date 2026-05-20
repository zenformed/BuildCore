import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectDetail } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function setCrmProjectCompletion(
  repositories: CrmRepositories,
  slug: string,
  complete: boolean
): Promise<CrmProjectDetail | null> {
  return resolveCrmRepositoryResult(repositories.projectDetail.setCompletion(slug, complete));
}
