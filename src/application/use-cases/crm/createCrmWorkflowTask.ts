import type { CrmRepositories } from '@/application/ports/crm';
import type { CreateCrmWorkflowTaskInput, CrmWorkflowTask } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function createCrmWorkflowTask(
  repositories: CrmRepositories,
  input: CreateCrmWorkflowTaskInput
): Promise<CrmWorkflowTask> {
  return resolveCrmRepositoryResult(repositories.workflowTasks.create(input));
}
