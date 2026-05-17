import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectSummary } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function listCrmProjectSummaries(
  repositories: CrmRepositories
): Promise<readonly CrmProjectSummary[]> {
  return resolveCrmRepositoryResult(repositories.projects.listSummaries());
}

/** Synchronous read for mock data source only (avoids loading flash on dashboard). */
export function listCrmProjectSummariesSync(
  repositories: CrmRepositories
): readonly CrmProjectSummary[] {
  const result = repositories.projects.listSummaries();
  if (result instanceof Promise) {
    throw new Error('listCrmProjectSummariesSync requires mock CRM data source');
  }
  return result;
}
