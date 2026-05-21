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
