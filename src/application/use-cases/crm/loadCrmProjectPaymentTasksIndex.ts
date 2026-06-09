import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmRepositories } from '@/application/ports/crm/CrmRepositories';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { buildMockProjectPaymentTasksIndex } from '@/infrastructure/crm/mock/buildMockProjectPaymentTasksIndex';

export async function loadCrmProjectPaymentTasksIndex(
  repos: CrmRepositories
): Promise<CrmProjectPaymentTasksIndex> {
  if (getCrmDataSource() !== 'api') {
    return buildMockProjectPaymentTasksIndex();
  }
  return repos.projects.listPaymentBalanceTasks();
}

export function loadCrmProjectPaymentTasksIndexSync(
  repos: CrmRepositories
): CrmProjectPaymentTasksIndex {
  if (getCrmDataSource() !== 'mock') {
    throw new Error('loadCrmProjectPaymentTasksIndexSync requires mock CRM data source');
  }
  void repos;
  return buildMockProjectPaymentTasksIndex();
}
