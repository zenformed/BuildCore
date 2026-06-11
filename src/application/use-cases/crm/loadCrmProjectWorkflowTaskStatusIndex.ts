import type { CrmProjectWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';
import type { CrmRepositories } from '@/application/ports/crm/CrmRepositories';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { buildMockProjectWorkflowTaskStatusIndex } from '@/infrastructure/crm/mock/buildMockProjectWorkflowTaskStatusIndex';

export async function loadCrmProjectWorkflowTaskStatusIndex(
  repos: CrmRepositories
): Promise<CrmProjectWorkflowTaskStatusIndex> {
  if (getCrmDataSource() !== 'api') {
    return buildMockProjectWorkflowTaskStatusIndex();
  }
  return repos.projects.listWorkflowTaskStatuses();
}

export function loadCrmProjectWorkflowTaskStatusIndexSync(
  repos: CrmRepositories
): CrmProjectWorkflowTaskStatusIndex {
  if (getCrmDataSource() !== 'mock') {
    throw new Error('loadCrmProjectWorkflowTaskStatusIndexSync requires mock CRM data source');
  }
  void repos;
  return buildMockProjectWorkflowTaskStatusIndex();
}
