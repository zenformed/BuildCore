import type { CrmProjectDetail } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm';
import {
  collectPaymentTasks,
  computeAvgDaysToPayInRange,
  computeMarginPercent,
  countCollectedInRange,
  sumCollectedInRange,
  sumCostsInRange,
  sumInvoicedInRange,
  sumReceivablesOutstandingAsOf,
} from './reportsFinancialMetrics';

export type ReportsPeriodFinancialSnapshot = {
  readonly collectedCents: number;
  readonly invoicedCents: number;
  readonly receivablesCents: number;
  readonly costsCents: number;
  readonly netProfitCents: number;
  readonly marginPercent: number | null;
  readonly paymentCount: number;
  readonly avgPaymentCents: number;
  readonly avgDaysToPay: number | null;
};

export function computeReportsPeriodFinancials(
  projects: readonly CrmProjectDetail[],
  start: Date,
  end: Date,
  receivablesAsOf: Date = end
): ReportsPeriodFinancialSnapshot {
  const payments = collectPaymentTasks(projects);
  const collectedCents = sumCollectedInRange(payments, start, end);
  const invoicedCents = sumInvoicedInRange(payments, start, end);
  const receivablesCents = sumReceivablesOutstandingAsOf(payments, receivablesAsOf);
  const costsCents = sumCostsInRange(projects, start, end).totalCents;
  const netProfitCents = collectedCents - costsCents;
  const paymentCount = countCollectedInRange(payments, start, end);

  return {
    collectedCents,
    invoicedCents,
    receivablesCents,
    costsCents,
    netProfitCents,
    marginPercent: computeMarginPercent(netProfitCents, collectedCents),
    paymentCount,
    avgPaymentCents: paymentCount > 0 ? Math.round(collectedCents / paymentCount) : 0,
    avgDaysToPay: computeAvgDaysToPayInRange(payments, start, end),
  };
}

export type ReportsTopProjectResult = {
  readonly projectName: string;
  readonly collectedCents: number;
  readonly profitCents: number;
};

export function findTopProjectForPeriod(
  projects: readonly CrmProjectDetail[],
  start: Date,
  end: Date
): ReportsTopProjectResult | null {
  let best: ReportsTopProjectResult | null = null;

  for (const project of projects) {
    const payments = project.workflowTasks.filter(isPaymentWorkflowTask);
    const collectedCents = sumCollectedInRange(payments, start, end);
    const costsCents = sumCostsInRange([project], start, end).totalCents;
    const profitCents = collectedCents - costsCents;

    if (collectedCents <= 0 && profitCents <= 0) continue;

    const score = collectedCents > 0 ? collectedCents : profitCents;
    const bestScore =
      best == null ? -1 : best.collectedCents > 0 ? best.collectedCents : best.profitCents;

    if (score > bestScore) {
      best = {
        projectName: project.summary.name,
        collectedCents,
        profitCents,
      };
    }
  }

  return best;
}

export function periodHasFinancialActivity(snapshot: ReportsPeriodFinancialSnapshot): boolean {
  return (
    snapshot.collectedCents > 0 ||
    snapshot.invoicedCents > 0 ||
    snapshot.costsCents > 0 ||
    snapshot.paymentCount > 0
  );
}
