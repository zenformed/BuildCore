import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { PaymentBalanceTask } from '@/domain/crm/paymentWorkflow';
import { MOCK_CRM_PROJECT_DETAILS } from '@/platform/mock/crm';
import { getEffectiveMockProjectDetailBySlug } from './mockCrmMutationStore';

function toPaymentBalanceTasks(
  workflowTasks: readonly { amountCents: number | null; status: string; paidAt?: string | null }[]
): readonly PaymentBalanceTask[] {
  return workflowTasks
    .filter((task) => task.amountCents != null)
    .map((task) => ({
      amountCents: task.amountCents,
      status: task.status as PaymentBalanceTask['status'],
      paidAt: task.paidAt ?? null,
    }));
}

export function buildMockProjectPaymentTasksIndex(): CrmProjectPaymentTasksIndex {
  const index = new Map<string, readonly PaymentBalanceTask[]>();
  for (const seed of MOCK_CRM_PROJECT_DETAILS) {
    const effective = getEffectiveMockProjectDetailBySlug(seed.summary.slug);
    const detail = effective ?? seed;
    index.set(detail.summary.id, toPaymentBalanceTasks(detail.workflowTasks));
  }
  return index;
}
