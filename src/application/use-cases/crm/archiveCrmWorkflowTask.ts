import type { CrmRepositories } from '@/application/ports/crm';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';

export async function archiveCrmWorkflowTask(
  repositories: CrmRepositories,
  taskId: string
): Promise<boolean> {
  return resolveCrmRepositoryResult(repositories.workflowTasks.archive(taskId));
}
