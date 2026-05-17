import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmWorkflowTask, UpdateCrmWorkflowTaskInput } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function updateCrmWorkflowTask(
  repositories: CrmRepositories,
  input: UpdateCrmWorkflowTaskInput
): Promise<CrmWorkflowTask | null> {
  return resolveCrmRepositoryResult(repositories.workflowTasks.update(input));
}
