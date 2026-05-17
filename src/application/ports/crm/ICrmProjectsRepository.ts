import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

/** List/read access for the all-projects pipeline table. */
export interface ICrmProjectsRepository {
  listSummaries(): CrmRepositoryResult<readonly CrmProjectSummary[]>;
}
