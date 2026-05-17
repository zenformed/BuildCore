import type { CrmWorkflowTask } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export interface ICrmWorkflowTasksRepository {
  listByProjectId(projectId: string): CrmRepositoryResult<readonly CrmWorkflowTask[]>;
}
