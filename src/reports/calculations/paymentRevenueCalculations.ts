import { isPaymentWorkflowTask, type CrmWorkflowTask, type WorkflowTaskStatus } from '@/domain/crm';

export type PaymentWorkflowTaskSlice = Pick<CrmWorkflowTask, 'amountCents' | 'status'>;

export type PaymentRevenueTotals = {
  readonly totalInvoicedCents: number;
  readonly totalPaidCents: number;
  readonly remainingReceivablesCents: number;
};

const PAID_PAYMENT_STATUSES: readonly WorkflowTaskStatus[] = ['done'];

export function isPaidPaymentWorkflowTask(task: PaymentWorkflowTaskSlice): boolean {
  return isPaymentWorkflowTask(task) && PAID_PAYMENT_STATUSES.includes(task.status);
}

/** Revenue from Payments rail rows (workflow tasks with amounts). */
export function computePaymentRevenueFromWorkflowTasks(
  tasks: readonly PaymentWorkflowTaskSlice[]
): PaymentRevenueTotals {
  let totalInvoicedCents = 0;
  let totalPaidCents = 0;

  for (const task of tasks) {
    if (!isPaymentWorkflowTask(task)) continue;
    const amountCents = task.amountCents ?? 0;
    totalInvoicedCents += amountCents;
    if (isPaidPaymentWorkflowTask(task)) {
      totalPaidCents += amountCents;
    }
  }

  return {
    totalInvoicedCents,
    totalPaidCents,
    remainingReceivablesCents: totalInvoicedCents - totalPaidCents,
  };
}
