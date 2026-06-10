/** Scope metadata for future multi-project / period reports. */
export type ReportScope =
  | { readonly kind: 'project'; readonly projectId: string; readonly projectSlug: string }
  | { readonly kind: 'organization' }
  | {
      readonly kind: 'period';
      readonly period: 'quarter' | 'year';
      readonly year: number;
      readonly quarter?: number;
    };

export type ReportLineItemRow = {
  readonly itemName: string;
  readonly categoryLabel: string;
  readonly costCents: number;
  readonly budgetCents: number;
  readonly remainingCents: number;
  readonly documentCount: number;
};

export type ReportCategoryTotalRow = {
  readonly categoryLabel: string;
  readonly costCents: number;
  /** 0–100 when total cost > 0. */
  readonly percentOfTotalCost: number;
  readonly color: string;
};

export type ReportPieSlice = {
  readonly label: string;
  readonly costCents: number;
  readonly color: string;
  readonly fraction: number;
};

export type {
  ProjectFinancialReportContext,
  ProjectFinancialReportCostRow,
  ProjectFinancialReportData,
  ProjectFinancialReportPaymentRow,
  ProjectFinancialSummary,
} from './types/projectFinancialReport';

/** @deprecated Use ProjectFinancialReportContext */
export type ProjectProfitAndLossReportContext = import('./types/projectFinancialReport').ProjectFinancialReportContext;

/** @deprecated Use ProjectFinancialReportData */
export type ProjectProfitAndLossReportData = import('./types/projectFinancialReport').ProjectFinancialReportData;

/** @deprecated Legacy P&L revenue block; project financial reports use ProjectFinancialSummary. */
export type ProfitAndLossRevenueSummary = {
  readonly totalInvoicedCents: number;
  readonly totalPaidCents: number;
  readonly remainingReceivablesCents: number;
};

/** @deprecated Legacy P&L performance block; project financial reports use ProjectFinancialSummary. */
export type ProfitAndLossPerformanceSummary = {
  readonly totalBudgetCents: number;
  readonly totalCostCents: number;
  readonly remainingBudgetCents: number;
  readonly actualProfitCents: number;
  readonly marginPercent: number | null;
};

/** @deprecated Legacy P&L financial block; project financial reports use ProjectFinancialSummary. */
export type ProfitAndLossFinancialSummary = {
  readonly revenue: ProfitAndLossRevenueSummary;
  readonly performance: ProfitAndLossPerformanceSummary;
};
