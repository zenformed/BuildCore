import type { CrmAccountabilityAction } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export interface ICrmAccountabilityRepository {
  listByProjectId(projectId: string): CrmRepositoryResult<readonly CrmAccountabilityAction[]>;
}
