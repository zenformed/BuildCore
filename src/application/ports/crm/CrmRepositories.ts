import type { ICrmAccountabilityRepository } from './ICrmAccountabilityRepository';
import type { ICrmBudgetRepository } from './ICrmBudgetRepository';
import type { ICrmDocumentsRepository } from './ICrmDocumentsRepository';
import type { ICrmMilestonePaymentsRepository } from './ICrmMilestonePaymentsRepository';
import type { ICrmProjectDetailRepository } from './ICrmProjectDetailRepository';
import type { ICrmProjectsRepository } from './ICrmProjectsRepository';
import type { ICrmReportsRepository } from './ICrmReportsRepository';
import type { ICrmWorkflowTasksRepository } from './ICrmWorkflowTasksRepository';

export type CrmRepositories = {
  readonly projects: ICrmProjectsRepository;
  readonly projectDetail: ICrmProjectDetailRepository;
  readonly workflowTasks: ICrmWorkflowTasksRepository;
  readonly documents: ICrmDocumentsRepository;
  readonly milestonePayments: ICrmMilestonePaymentsRepository;
  readonly accountability: ICrmAccountabilityRepository;
  readonly budget: ICrmBudgetRepository;
  readonly reports: ICrmReportsRepository;
};
