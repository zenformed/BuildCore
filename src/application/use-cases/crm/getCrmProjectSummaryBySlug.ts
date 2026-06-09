import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectSummary } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function getCrmProjectSummaryBySlug(
  repositories: CrmRepositories,
  slug: string
): Promise<CrmProjectSummary | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  return resolveCrmRepositoryResult(repositories.projects.getSummaryBySlug(trimmed));
}

/** Synchronous read for mock data source only. */
export function getCrmProjectSummaryBySlugSync(
  repositories: CrmRepositories,
  slug: string
): CrmProjectSummary | null {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const result = repositories.projects.getSummaryBySlug(trimmed);
  if (result instanceof Promise) {
    throw new Error('getCrmProjectSummaryBySlugSync requires mock CRM data source');
  }
  return result;
}
