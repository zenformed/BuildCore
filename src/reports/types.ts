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

export type ProfitAndLossRevenueSummary = {
  readonly totalInvoicedCents: number;
  readonly totalPaidCents: number;
  readonly remainingReceivablesCents: number;
};

export type ProfitAndLossPerformanceSummary = {
  readonly totalBudgetCents: number;
  readonly totalCostCents: number;
  readonly remainingBudgetCents: number;
  readonly actualProfitCents: number;
  readonly marginPercent: number | null;
};

export type ProfitAndLossFinancialSummary = {
  readonly revenue: ProfitAndLossRevenueSummary;
  readonly performance: ProfitAndLossPerformanceSummary;
};

export type ProjectProfitAndLossReportContext = {
  /** Organization display name (Core branding / avatar menu shop name). */
  readonly organizationName: string;
};

export type ProjectProfitAndLossReportData = {
  readonly scope: ReportScope;
  readonly organizationName: string;
  readonly reportTitle: string;
  readonly projectName: string;
  readonly projectSlug: string;
  readonly generatedAtIso: string;
  readonly generatedAtLabel: string;

  readonly customerName: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;

  readonly financial: ProfitAndLossFinancialSummary;
  readonly lineItems: readonly ReportLineItemRow[];
  readonly categoryTotals: readonly ReportCategoryTotalRow[];
  readonly pieSlices: readonly ReportPieSlice[];
};
