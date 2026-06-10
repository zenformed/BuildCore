import type { CrmProjectDetail } from './project';
import type { PipelineStageSlug } from './pipelineStage';
import type { CrmWorkflowTask } from './workflowTask';

/**
 * Payment milestone model (BuildCore CRM)
 *
 * - Payment milestones are normal `crm_workflow_tasks` rows with non-null `amount_cents`.
 * - Storage uses `stage_slug = 'paid'` as the canonical bucket (pipeline stage "Paid" on the
 *   project summary is unchanged — it still means the deal reached the Paid pipeline step).
 * - Workflow UI groups all payment tasks under the label **Payments**, not **Paid**.
 * - Receipts/documents will attach to these tasks in a later phase (no uploads in this slice).
 */

/** Canonical `stage_slug` stored on payment milestone tasks. */
export const PAYMENT_WORKFLOW_STAGE_SLUG: PipelineStageSlug = 'paid';

/** UI collapse key for the Payments group (distinct from pipeline stage slug). */
export const PAYMENTS_WORKFLOW_COLLAPSE_KEY = 'payments' as const;

export type WorkflowStageCollapseKey = PipelineStageSlug | typeof PAYMENTS_WORKFLOW_COLLAPSE_KEY;

export type PaymentBalanceTask = Pick<CrmWorkflowTask, 'amountCents' | 'status'> & {
  readonly id?: string;
  readonly title?: string;
  readonly paidAt?: string | null;
};

export function isPaymentWorkflowTask(task: Pick<CrmWorkflowTask, 'amountCents'>): boolean {
  return task.amountCents != null;
}

/** True when a payment milestone has a non-empty paid_at (accounting source of truth). */
export function hasPaymentPaidAt(task: PaymentBalanceTask): boolean {
  return task.paidAt != null && task.paidAt.trim() !== '';
}

/** Unpaid balance = payment milestones without paid_at (status alone does not count as collected). */
export function isUnpaidPaymentTask(task: PaymentBalanceTask): boolean {
  if (!isPaymentWorkflowTask(task)) return false;
  return !hasPaymentPaidAt(task);
}

/** Sum unpaid payment-task amounts; otherwise use contract value (no milestones yet). */
export function computeProjectBalanceCents(
  tasks: readonly PaymentBalanceTask[],
  dealValueCents: number
): number {
  const paymentTasks = tasks.filter(isPaymentWorkflowTask);
  if (paymentTasks.length === 0) return dealValueCents;
  return paymentTasks
    .filter(isUnpaidPaymentTask)
    .reduce((sum, task) => sum + (task.amountCents ?? 0), 0);
}

export function projectHasPaymentMilestones(
  project: Pick<CrmProjectDetail, 'workflowTasks'>
): boolean {
  return project.workflowTasks.some(isPaymentWorkflowTask);
}

export function applyPaymentBalanceToProjectDetail(detail: CrmProjectDetail): CrmProjectDetail {
  const balanceRemainingCents = computeProjectBalanceCents(
    detail.workflowTasks,
    detail.summary.dealValueCents
  );

  if (
    balanceRemainingCents === detail.summary.balanceRemainingCents &&
    balanceRemainingCents === detail.milestonePayment.balanceCents
  ) {
    return detail;
  }
  return {
    ...detail,
    summary: { ...detail.summary, balanceRemainingCents },
    milestonePayment: { ...detail.milestonePayment, balanceCents: balanceRemainingCents },
  };
}
