import { isPaymentWorkflowTask, type CrmWorkflowTask } from '@/domain/crm';

export type PaymentWorkflowTaskSlice = Pick<CrmWorkflowTask, 'amountCents' | 'invoicedAt' | 'paidAt'>;

export type PaymentRevenueTotals = {
  readonly totalInvoicedCents: number;
  readonly totalPaidCents: number;
  readonly remainingReceivablesCents: number;
};

export function isPaidPaymentWorkflowTask(task: PaymentWorkflowTaskSlice): boolean {
  return isPaymentWorkflowTask(task) && task.paidAt != null;
}

export function isInvoicedPaymentWorkflowTask(task: PaymentWorkflowTaskSlice): boolean {
  return isPaymentWorkflowTask(task) && task.invoicedAt != null;
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
    if (task.invoicedAt != null) {
      totalInvoicedCents += amountCents;
    }
    if (task.paidAt != null) {
      totalPaidCents += amountCents;
    }
  }

  return {
    totalInvoicedCents,
    totalPaidCents,
    remainingReceivablesCents: totalInvoicedCents - totalPaidCents,
  };
}
