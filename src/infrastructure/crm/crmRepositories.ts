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
import { ApiCrmReportsRepository } from '@/infrastructure/crm/api/ApiCrmReportsRepository';
import {
  MockCrmAccountabilityRepository,
  MockCrmBudgetRepository,
  MockCrmDocumentsRepository,
  MockCrmMilestonePaymentsRepository,
  MockCrmProjectDetailRepository,
  MockCrmProjectsRepository,
  MockCrmWorkflowTasksRepository,
} from '@/infrastructure/crm/mock/MockCrmRepositories';
import { MockCrmReportsRepository } from '@/infrastructure/crm/mock/MockCrmReportsRepository';

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
    reports: new MockCrmReportsRepository(),
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
    reports: new ApiCrmReportsRepository(),
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
