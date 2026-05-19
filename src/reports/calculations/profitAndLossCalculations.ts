import type { PaymentRevenueTotals } from './paymentRevenueCalculations';

export type ProfitAndLossCostInput = {
  readonly totalBudgetCents: number;
  readonly totalCostCents: number;
};

export type ProfitAndLossMetricsInput = PaymentRevenueTotals & ProfitAndLossCostInput;

export type ProfitAndLossRevenueSummary = {
  readonly totalInvoicedCents: number;
  readonly totalPaidCents: number;
  readonly remainingReceivablesCents: number;
};

export type ProfitAndLossPerformanceSummary = {
  readonly totalBudgetCents: number;
  readonly totalCostCents: number;
  readonly remainingBudgetCents: number;
  /** Invoiced revenue minus actual cost. */
  readonly actualProfitCents: number;
  /** Actual profit / total invoiced when invoiced > 0. */
  readonly marginPercent: number | null;
};

export type ProfitAndLossMetrics = {
  readonly revenue: ProfitAndLossRevenueSummary;
  readonly performance: ProfitAndLossPerformanceSummary;
};

export function computeProfitAndLossMetrics(input: ProfitAndLossMetricsInput): ProfitAndLossMetrics {
  const remainingBudgetCents = input.totalBudgetCents - input.totalCostCents;
  const actualProfitCents = input.totalInvoicedCents - input.totalCostCents;
  const marginPercent =
    input.totalInvoicedCents > 0 ? (actualProfitCents / input.totalInvoicedCents) * 100 : null;

  return {
    revenue: {
      totalInvoicedCents: input.totalInvoicedCents,
      totalPaidCents: input.totalPaidCents,
      remainingReceivablesCents: input.remainingReceivablesCents,
    },
    performance: {
      totalBudgetCents: input.totalBudgetCents,
      totalCostCents: input.totalCostCents,
      remainingBudgetCents,
      actualProfitCents,
      marginPercent,
    },
  };
}

export function computeCategoryPercentOfTotal(costCents: number, totalCostCents: number): number {
  if (totalCostCents <= 0) return 0;
  return (costCents / totalCostCents) * 100;
}
