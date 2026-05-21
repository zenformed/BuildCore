import type { ReportPeriodId } from './crmReportsDashboard';

export type ReportsSummaryPdfColumnKey = 'mtd' | 'ytd' | 'lastYearMtd' | 'lastYearYtd';

export type ReportsSummaryPdfCell = {
  readonly amountCents: number;
  readonly percent: number;
};

export type ReportsSummaryPdfMetricCells = Record<
  ReportsSummaryPdfColumnKey,
  ReportsSummaryPdfCell
>;

export type ReportsSummaryPdfColumn = {
  readonly key: ReportsSummaryPdfColumnKey;
  readonly revenueCents: number;
  readonly costCents: number;
};

export type ReportsSummaryPdfDetailLine = {
  readonly label: string;
  readonly cells: ReportsSummaryPdfMetricCells;
};

export type ReportsSummaryPdfSectionId = 'revenue' | 'cogs' | 'operatingExpenses';

export type ReportsSummaryPdfSection = {
  readonly id: ReportsSummaryPdfSectionId;
  /** Section header only (no amounts on this row). */
  readonly title: string;
  readonly details: readonly ReportsSummaryPdfDetailLine[];
  /** Subtotal row label (e.g. Total Revenue). */
  readonly totalLabel: string;
  readonly total: ReportsSummaryPdfMetricCells;
};

export type ReportsSummaryPdfSummaryLineId = 'grossMargin' | 'netProfit';

export type ReportsSummaryPdfSummaryLine = {
  readonly id: ReportsSummaryPdfSummaryLineId;
  readonly label: string;
  readonly cells: ReportsSummaryPdfMetricCells;
};

export type ReportsSummaryPdfBlock =
  | { readonly kind: 'section'; readonly section: ReportsSummaryPdfSection }
  | { readonly kind: 'summary'; readonly line: ReportsSummaryPdfSummaryLine };

export type ReportsSummaryPdfColumnHeader = {
  readonly amount: string;
  readonly percent: string;
};

export type CrmReportsSummaryPdfData = {
  readonly organizationName: string;
  readonly reportTitle: string;
  readonly periodId: ReportPeriodId;
  readonly currentYear: number;
  readonly priorYear: number;
  readonly yearContextLine: string;
  readonly generatedAtLabel: string;
  readonly asOfLabel: string;
  readonly footerNote: string;
  readonly columnHeaders: readonly ReportsSummaryPdfColumnHeader[];
  readonly columns: readonly ReportsSummaryPdfColumn[];
  readonly blocks: readonly ReportsSummaryPdfBlock[];
};

export type CrmReportsSummaryPdfContext = {
  readonly organizationName: string;
  readonly periodId: ReportPeriodId;
  readonly periodLabel: string;
};
