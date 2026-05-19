import type { CrmRepositories } from '@/application/ports/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import {
  ApiCrmAccountabilityRepository,
  ApiCrmBudgetRepository,
  ApiCrmDocumentsRepository,
  ApiCrmMilestonePaymentsRepository,
  ApiCrmProjectDetailRepository,
  ApiCrmProjectsRepository,
  ApiCrmWorkflowTasksRepository,
} from '@/infrastructure/crm/api/ApiCrmRepositories';
import {
  MockCrmAccountabilityRepository,
  MockCrmBudgetRepository,
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
    budget: new MockCrmBudgetRepository(),
  };
}

function createApiCrmRepositories(): CrmRepositories {
  return {
    projects: new ApiCrmProjectsRepository(),
    projectDetail: new ApiCrmProjectDetailRepository(),
    workflowTasks: new ApiCrmWorkflowTasksRepository(),
    documents: new ApiCrmDocumentsRepository(),
    milestonePayments: new ApiCrmMilestonePaymentsRepository(),
    accountability: new ApiCrmAccountabilityRepository(),
    budget: new ApiCrmBudgetRepository(),
  };
}

function createCrmRepositories(): CrmRepositories {
  const source = getCrmDataSource();
  if (source === 'api') {
    return createApiCrmRepositories();
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
