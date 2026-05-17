import type { CrmWorkflowTask } from '@/domain/crm';

export interface ICrmWorkflowTasksRepository {
  listByProjectId(projectId: string): readonly CrmWorkflowTask[];
}
