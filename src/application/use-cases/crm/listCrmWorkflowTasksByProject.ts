import type { CrmRepositories } from '@/application/ports/crm';
import type { CrmWorkflowTask } from '@/domain/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export type ListCrmWorkflowTasksByProjectInput = {
  readonly projectId: string;
  readonly projectSlug: string;
};

export async function listCrmWorkflowTasksByProject(
  repositories: CrmRepositories,
  input: ListCrmWorkflowTasksByProjectInput
): Promise<readonly CrmWorkflowTask[]> {
  return resolveCrmRepositoryResult(repositories.workflowTasks.listByProject(input));
}
