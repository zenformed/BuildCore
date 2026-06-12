import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectRouteScope } from '@/application/ports/crm/ICrmProjectDetailRepository';
import type { CrmProjectDetail } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function markCrmProjectEmptyStagesCompleteBatch(
  repositories: CrmRepositories,
  slug: string,
  scope?: CrmProjectRouteScope
): Promise<CrmProjectDetail | null> {
  return resolveCrmRepositoryResult(
    repositories.projectDetail.markEmptyStagesCompleteBatch(slug, scope)
  );
}
