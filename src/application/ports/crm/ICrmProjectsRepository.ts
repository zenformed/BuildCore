import type {
  CreateCrmProjectInput,
  CreateCrmProjectResult,
  CrmProjectSummary,
} from '@/domain/crm';
import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export type ListCrmProjectSummariesOptions = {
  /** When true (default), only root projects (parent_project_id IS NULL) are returned. */
  readonly rootsOnly?: boolean;
};

export type ListCrmProjectChildSummariesInput = {
  readonly parentProjectId: string;
  readonly parentSlug: string;
};

/** List/read access for the all-projects pipeline table. */
export interface ICrmProjectsRepository {
  listSummaries(
    options?: ListCrmProjectSummariesOptions
  ): CrmRepositoryResult<readonly CrmProjectSummary[]>;
  listChildSummaries(
    input: ListCrmProjectChildSummariesInput
  ): CrmRepositoryResult<readonly CrmProjectSummary[]>;
  listPaymentBalanceTasks(): CrmRepositoryResult<CrmProjectPaymentTasksIndex>;
  listWorkflowTaskStatuses(): CrmRepositoryResult<CrmProjectWorkflowTaskStatusIndex>;
  listWorkflowProgressInputs(): CrmRepositoryResult<CrmProjectWorkflowProgressInputIndex>;
  listBudgetEntries(): CrmRepositoryResult<CrmProjectBudgetEntriesIndex>;
  getSummaryBySlug(slug: string): CrmRepositoryResult<CrmProjectSummary | null>;
  create(input: CreateCrmProjectInput): CrmRepositoryResult<CreateCrmProjectResult>;
  archive(slug: string): CrmRepositoryResult<boolean>;
}
