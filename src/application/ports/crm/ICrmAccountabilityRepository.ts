import type { CrmAccountabilityAction } from '@/domain/crm';

export interface ICrmAccountabilityRepository {
  listByProjectId(projectId: string): readonly CrmAccountabilityAction[];
}
