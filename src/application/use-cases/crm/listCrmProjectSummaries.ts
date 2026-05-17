import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmProjectSummary } from '@/domain/crm';

export function listCrmProjectSummaries(repositories: CrmRepositories): readonly CrmProjectSummary[] {
  return repositories.projects.listSummaries();
}
