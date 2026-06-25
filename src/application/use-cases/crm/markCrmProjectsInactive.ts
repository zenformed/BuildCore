import type { CrmRepositories } from '@/application/ports/crm';
import type { BulkMarkInactiveCrmProjectsResult } from '@/domain/crm/bulkMarkInactiveProjects';
import type { MarkCrmProjectsInactiveInput } from '@/domain/crm/subprojectStatus';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function markCrmProjectsInactive(
  repositories: CrmRepositories,
  input: MarkCrmProjectsInactiveInput
): Promise<BulkMarkInactiveCrmProjectsResult> {
  return resolveCrmRepositoryResult(repositories.projects.markInactive(input));
}
