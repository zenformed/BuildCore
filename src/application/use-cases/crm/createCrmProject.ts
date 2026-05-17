import type { CrmRepositories } from '@/application/ports/crm';
import type { CreateCrmProjectInput, CreateCrmProjectResult } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function createCrmProject(
  repositories: CrmRepositories,
  input: CreateCrmProjectInput
): Promise<CreateCrmProjectResult> {
  return resolveCrmRepositoryResult(repositories.projects.create(input));
}
