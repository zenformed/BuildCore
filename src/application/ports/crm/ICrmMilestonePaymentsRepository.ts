import type { CrmMilestonePaymentSummary } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export interface ICrmMilestonePaymentsRepository {
  getByProjectId(projectId: string): CrmRepositoryResult<CrmMilestonePaymentSummary | null>;
}
