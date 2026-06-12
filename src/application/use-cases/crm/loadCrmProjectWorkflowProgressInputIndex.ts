import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import type { CrmRepositories } from '@/application/ports/crm/CrmRepositories';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { buildMockProjectWorkflowProgressInputIndex } from '@/infrastructure/crm/mock/buildMockProjectWorkflowProgressInputIndex';

export async function loadCrmProjectWorkflowProgressInputIndex(
  repos: CrmRepositories
): Promise<CrmProjectWorkflowProgressInputIndex> {
  if (getCrmDataSource() !== 'api') {
    return buildMockProjectWorkflowProgressInputIndex();
  }
  return repos.projects.listWorkflowProgressInputs();
}

export function loadCrmProjectWorkflowProgressInputIndexSync(
  repos: CrmRepositories
): CrmProjectWorkflowProgressInputIndex {
  if (getCrmDataSource() !== 'mock') {
    throw new Error('loadCrmProjectWorkflowProgressInputIndexSync requires mock CRM data source');
  }
  void repos;
  return buildMockProjectWorkflowProgressInputIndex();
}
