import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectDetail, PipelineStageSlug } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function markCrmProjectStageCompleteManual(
  repositories: CrmRepositories,
  slug: string,
  stageSlug: PipelineStageSlug
): Promise<CrmProjectDetail | null> {
  return resolveCrmRepositoryResult(
    repositories.projectDetail.markStageCompleteManual(slug, stageSlug)
  );
}
