import type {
  CreateCrmWorkflowTaskInput,
  CrmWorkflowTask,
  UpdateCrmWorkflowTaskInput,
} from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export interface ICrmWorkflowTasksRepository {
  listByProjectId(projectId: string): CrmRepositoryResult<readonly CrmWorkflowTask[]>;
  create(input: CreateCrmWorkflowTaskInput): CrmRepositoryResult<CrmWorkflowTask>;
  update(input: UpdateCrmWorkflowTaskInput): CrmRepositoryResult<CrmWorkflowTask | null>;
  archive(taskId: string): CrmRepositoryResult<boolean>;
}
