import type { CrmProjectDetail } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export interface ICrmReportsRepository {
  listProjectDetails(): CrmRepositoryResult<readonly CrmProjectDetail[]>;
}
