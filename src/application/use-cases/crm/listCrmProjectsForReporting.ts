import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectDetail } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function listCrmProjectsForReporting(
  repositories: CrmRepositories
): Promise<readonly CrmProjectDetail[]> {
  return resolveCrmRepositoryResult(repositories.reports.listProjectDetails());
}

/** Synchronous read for mock data source only. */
export function listCrmProjectsForReportingSync(
  repositories: CrmRepositories
): readonly CrmProjectDetail[] {
  const result = repositories.reports.listProjectDetails();
  if (result instanceof Promise) {
    throw new Error('listCrmProjectsForReportingSync requires mock CRM data source');
  }
  return result;
}
