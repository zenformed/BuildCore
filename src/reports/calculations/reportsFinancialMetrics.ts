import {
  type CrmBudgetCategory,
  isPaymentWorkflowTask,
  type CrmProjectDetail,
  type CrmWorkflowTask,
} from '@/domain/crm';
import { isTimestampInRange } from './reportPeriodRange';

type PaymentRow = Pick<CrmWorkflowTask, 'amountCents' | 'invoicedAt' | 'paidAt' | 'dueAt'>;

export function collectPaymentTasks(projects: readonly CrmProjectDetail[]): PaymentRow[] {
  const rows: PaymentRow[] = [];
  for (const project of projects) {
    for (const task of project.workflowTasks) {
      if (isPaymentWorkflowTask(task)) {
        rows.push(task);
      }
    }
  }
  return rows;
}

/** Collected payments in range (reports revenue / Total Revenue). */
export function sumCollectedInRange(
  payments: readonly PaymentRow[],
  start: Date,
  end: Date
): number {
  let total = 0;
  for (const p of payments) {
    if (!isTimestampInRange(p.paidAt, start, end)) continue;
    total += p.amountCents ?? 0;
  }
  return total;
}

export function countCollectedInRange(
  payments: readonly PaymentRow[],
  start: Date,
  end: Date
): number {
  let count = 0;
  for (const p of payments) {
    if (isTimestampInRange(p.paidAt, start, end)) count += 1;
  }
  return count;
}

export function sumInvoicedInRange(
  payments: readonly PaymentRow[],
  start: Date,
  end: Date
): number {
  let total = 0;
  for (const p of payments) {
    if (!isTimestampInRange(p.invoicedAt, start, end)) continue;
    total += p.amountCents ?? 0;
  }
  return total;
}

/** Invoiced but not paid as of `asOf` (inclusive). */
export function sumReceivablesOutstandingAsOf(
  payments: readonly PaymentRow[],
  asOf: Date
): number {
  const asOfMs = asOf.getTime();
  let total = 0;
  for (const p of payments) {
    if (p.invoicedAt == null) continue;
    const invoicedMs = new Date(p.invoicedAt).getTime();
    if (Number.isNaN(invoicedMs) || invoicedMs > asOfMs) continue;
    if (p.paidAt != null) {
      const paidMs = new Date(p.paidAt).getTime();
      if (!Number.isNaN(paidMs) && paidMs <= asOfMs) continue;
    }
    total += p.amountCents ?? 0;
  }
  return total;
}

export function computeMarginPercent(
  profitCents: number,
  collectedCents: number
): number | null {
  if (collectedCents <= 0) return null;
  return (profitCents / collectedCents) * 100;
}

/** Average days from invoice to payment for payments paid within the range. */
export function computeAvgDaysToPayInRange(
  payments: readonly PaymentRow[],
  start: Date,
  end: Date
): number | null {
  const deltas: number[] = [];
  for (const p of payments) {
    if (!isTimestampInRange(p.paidAt, start, end)) continue;
    if (p.invoicedAt == null || p.paidAt == null) continue;
    const inv = new Date(p.invoicedAt).getTime();
    const paid = new Date(p.paidAt).getTime();
    if (Number.isNaN(inv) || Number.isNaN(paid) || paid < inv) continue;
    deltas.push((paid - inv) / 86_400_000);
  }
  if (deltas.length === 0) return null;
  return deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
}

export function resolveCostIncurredAtForReporting(entry: {
  costIncurredAt: string;
  createdAt: string;
}): { iso: string; usedCreatedAtFallback: boolean } {
  if (entry.costIncurredAt) {
    return { iso: entry.costIncurredAt, usedCreatedAtFallback: false };
  }
  return { iso: entry.createdAt, usedCreatedAtFallback: true };
}

export function sumCostsInRange(
  projects: readonly CrmProjectDetail[],
  start: Date,
  end: Date
): { totalCents: number; usedLegacyCreatedAtFallback: boolean } {
  let totalCents = 0;
  let usedLegacyCreatedAtFallback = false;
  for (const project of projects) {
    for (const entry of project.budget.entries) {
      const { iso, usedCreatedAtFallback } = resolveCostIncurredAtForReporting(entry);
      if (usedCreatedAtFallback) usedLegacyCreatedAtFallback = true;
      if (isTimestampInRange(iso, start, end)) {
        totalCents += entry.costCents;
      }
    }
  }
  return { totalCents, usedLegacyCreatedAtFallback };
}

export type ReportsFinancialColumnTotals = {
  readonly revenueCents: number;
  readonly costCents: number;
};

export function computeReportsFinancialColumnTotals(
  projects: readonly CrmProjectDetail[],
  start: Date,
  end: Date
): ReportsFinancialColumnTotals {
  const payments = collectPaymentTasks(projects);
  return {
    revenueCents: sumCollectedInRange(payments, start, end),
    costCents: sumCostsInRange(projects, start, end).totalCents,
  };
}

export function sumCostsByCategoryInRange(
  projects: readonly CrmProjectDetail[],
  start: Date,
  end: Date
): Map<CrmBudgetCategory, number> {
  const byCategory = new Map<CrmBudgetCategory, number>();
  for (const project of projects) {
    for (const entry of project.budget.entries) {
      const { iso } = resolveCostIncurredAtForReporting(entry);
      if (!isTimestampInRange(iso, start, end)) continue;
      byCategory.set(
        entry.category,
        (byCategory.get(entry.category) ?? 0) + entry.costCents
      );
    }
  }
  return byCategory;
}
