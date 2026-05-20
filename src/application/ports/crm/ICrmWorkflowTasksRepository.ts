import type {
  CreateCrmWorkflowTaskInput,
  CrmWorkflowTask,
  UpdateCrmWorkflowTaskInput,
} from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export type ListCrmWorkflowTasksByProjectRepoInput = {
  readonly projectId: string;
  readonly projectSlug: string;
};

export interface ICrmWorkflowTasksRepository {
  listByProject(
    input: ListCrmWorkflowTasksByProjectRepoInput
  ): CrmRepositoryResult<readonly CrmWorkflowTask[]>;
  create(input: CreateCrmWorkflowTaskInput): CrmRepositoryResult<CrmWorkflowTask>;
  update(input: UpdateCrmWorkflowTaskInput): CrmRepositoryResult<CrmWorkflowTask | null>;
  archive(taskId: string): CrmRepositoryResult<boolean>;
}
