import type { CrmRepositories } from '@/application/ports/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import {
  MockCrmAccountabilityRepository,
  MockCrmDocumentsRepository,
  MockCrmMilestonePaymentsRepository,
  MockCrmProjectDetailRepository,
  MockCrmProjectsRepository,
  MockCrmWorkflowTasksRepository,
} from '@/infrastructure/crm/mock/MockCrmRepositories';

let cached: CrmRepositories | null = null;

function createMockCrmRepositories(): CrmRepositories {
  return {
    projects: new MockCrmProjectsRepository(),
    projectDetail: new MockCrmProjectDetailRepository(),
    workflowTasks: new MockCrmWorkflowTasksRepository(),
    documents: new MockCrmDocumentsRepository(),
    milestonePayments: new MockCrmMilestonePaymentsRepository(),
    accountability: new MockCrmAccountabilityRepository(),
  };
}

function createCrmRepositories(): CrmRepositories {
  const source = getCrmDataSource();
  if (source === 'api') {
    throw new Error(
      'CRM API data source is not implemented yet. Use NEXT_PUBLIC_CRM_DATA_SOURCE=mock (default).'
    );
  }
  return createMockCrmRepositories();
}

/** Singleton CRM repository bag for hooks and use cases. */
export function getCrmRepositories(): CrmRepositories {
  if (cached == null) {
    cached = createCrmRepositories();
  }
  return cached;
}
