import type { CrmMilestonePaymentSummary } from '@/domain/crm';

export interface ICrmMilestonePaymentsRepository {
  getByProjectId(projectId: string): CrmMilestonePaymentSummary | null;
}
