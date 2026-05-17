import type { CrmProjectSummary } from '@/domain/crm';

/** List/read access for the all-projects pipeline table. */
export interface ICrmProjectsRepository {
  listSummaries(): readonly CrmProjectSummary[];
}
