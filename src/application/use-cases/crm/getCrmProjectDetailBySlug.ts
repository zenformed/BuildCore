import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectDetail } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function getCrmProjectDetailBySlug(
  repositories: CrmRepositories,
  slug: string
): Promise<CrmProjectDetail | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  return resolveCrmRepositoryResult(repositories.projectDetail.getBySlug(trimmed));
}

/** Synchronous read for mock data source only. */
export function getCrmProjectDetailBySlugSync(
  repositories: CrmRepositories,
  slug: string
): CrmProjectDetail | null {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const result = repositories.projectDetail.getBySlug(trimmed);
  if (result instanceof Promise) {
    throw new Error('getCrmProjectDetailBySlugSync requires mock CRM data source');
  }
  return result;
}
