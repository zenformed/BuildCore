import type { CrmRepositories } from '@/application/ports/crm';
import type {
  SetCrmProjectsStatusInput,
  SetCrmProjectsStatusResult,
} from '@/domain/crm/setCrmProjectsStatus';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function setCrmProjectsStatus(
  repositories: CrmRepositories,
  input: SetCrmProjectsStatusInput
): Promise<SetCrmProjectsStatusResult> {
  return resolveCrmRepositoryResult(repositories.projects.setStatus(input));
}
