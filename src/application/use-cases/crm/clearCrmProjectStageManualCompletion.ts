import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectRouteScope } from '@/application/ports/crm/ICrmProjectDetailRepository';
import type { CrmProjectDetail, PipelineStageSlug } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function clearCrmProjectStageManualCompletion(
  repositories: CrmRepositories,
  slug: string,
  stageSlug: PipelineStageSlug,
  scope?: CrmProjectRouteScope
): Promise<CrmProjectDetail | null> {
  return resolveCrmRepositoryResult(
    repositories.projectDetail.clearStageManualCompletion(slug, stageSlug, scope)
  );
}
