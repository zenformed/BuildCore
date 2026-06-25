import type { CrmRepositories } from '@/application/ports/crm';
import type { BulkMarkActiveCrmProjectsResult } from '@/domain/crm/bulkMarkActiveProjects';
import type { MarkCrmProjectsActiveInput } from '@/domain/crm/subprojectStatus';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function markCrmProjectsActive(
  repositories: CrmRepositories,
  input: MarkCrmProjectsActiveInput
): Promise<BulkMarkActiveCrmProjectsResult> {
  return resolveCrmRepositoryResult(repositories.projects.markActive(input));
}
