import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectSummary } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function listCrmProjectChildSummaries(
  repositories: CrmRepositories,
  input: { parentProjectId: string; parentSlug: string }
): Promise<readonly CrmProjectSummary[]> {
  return resolveCrmRepositoryResult(repositories.projects.listChildSummaries(input));
}

/** Synchronous read for mock data source only. */
export function listCrmProjectChildSummariesSync(
  repositories: CrmRepositories,
  input: { parentProjectId: string; parentSlug: string }
): readonly CrmProjectSummary[] {
  const result = repositories.projects.listChildSummaries(input);
  if (result instanceof Promise) {
    throw new Error('listCrmProjectChildSummariesSync requires mock CRM data source');
  }
  return result;
}
