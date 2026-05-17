import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectDetail, UpdateCrmProjectInput } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function updateCrmProject(
  repositories: CrmRepositories,
  slug: string,
  input: UpdateCrmProjectInput
): Promise<CrmProjectDetail | null> {
  return resolveCrmRepositoryResult(repositories.projectDetail.updateBySlug(slug, input));
}
