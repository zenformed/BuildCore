import type { CrmBudgetCategory } from '@/domain/crm';

export type ReportPeriodId = 'mtd' | 'qtd' | 'ytd' | 'all';

export type ReportChartTabId = 'revenue' | 'profit' | 'costs' | 'receivables';

export type ReportPeriodRange = {
  readonly period: ReportPeriodId;
  readonly start: Date;
  readonly end: Date;
  readonly previousStart: Date;
  readonly previousEnd: Date;
};

export type PeriodComparison = {
  readonly percent: number | null;
  readonly label: string;
};

export type ReportsKpiCard = {
  readonly mainCents: number;
  readonly comparison: PeriodComparison;
  readonly footLeft: string;
  readonly footRight: string;
};

export type ReportsSideMetric = {
  readonly label: string;
  readonly value: string;
};

export type ReportsProjectRow = {
  readonly projectId: string;
  readonly slug: string;
  readonly label: string;
  readonly collectedCents: number;
  readonly costsCents: number;
  readonly profitCents: number;
  readonly marginPercent: number | null;
  readonly statusLabel: string;
};

export type ReportsCostBreakdownRow = {
  readonly category: CrmBudgetCategory;
  readonly costCents: number;
};

export type ReportsTimeSeries = {
  /** Short labels for the X-axis. */
  readonly labels: readonly string[];
  /** Longer labels for point tooltips (e.g. "Week of May 20", "Q2 2026"). */
  readonly tooltipLabels: readonly string[];
  /** Values in cents aligned with labels. */
  readonly valuesCents: readonly number[];
};

export type CrmReportsDashboardData = {
  readonly period: ReportPeriodId;
  readonly collected: ReportsKpiCard & {
    readonly paymentCount: number;
    readonly avgPaymentCents: number;
  };
  readonly receivables: ReportsKpiCard & {
    readonly unpaidCount: number;
    readonly overdueCount: number;
  };
  readonly netProfit: ReportsKpiCard & {
    readonly marginPercent: number | null;
    readonly totalCostsCents: number;
  };
  readonly chart: ReportsTimeSeries;
  readonly sideMetrics: readonly ReportsSideMetric[];
  readonly projectRows: readonly ReportsProjectRow[];
  readonly costBreakdown: readonly ReportsCostBreakdownRow[];
  readonly costsIncludeUndatedEntries: boolean;
};
