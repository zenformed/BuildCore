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

export type ReportsProjectFilterId =
  | 'all'
  | 'active'
  | 'completed'
  | 'waiting_approval'
  | 'overdue_payments';

export type ReportsProjectRow = {
  readonly projectId: string;
  readonly slug: string;
  readonly parentProjectId: string | null;
  readonly parentSlug: string | null;
  readonly label: string;
  readonly collectedCents: number;
  readonly costsCents: number;
  readonly profitCents: number;
  readonly marginPercent: number | null;
  readonly statusLabel: string;
  readonly isCompleted: boolean;
  readonly isActive: boolean;
  readonly isWaitingApproval: boolean;
  readonly hasOverduePayments: boolean;
};

export type ReportsCostBreakdownRow = {
  readonly category: CrmBudgetCategory;
  readonly costCents: number;
  /** Share of total period costs (0–100). */
  readonly costPercent: number;
};

export type ReportsTimeSeries = {
  /** Short labels for the X-axis. */
  readonly labels: readonly string[];
  /** Longer labels for point tooltips (e.g. "Week of May 20", "Q2 2026"). */
  readonly tooltipLabels: readonly string[];
  /** Values in cents aligned with labels. */
  readonly valuesCents: readonly number[];
};

/** Daily / weekly / monthly revenue vs costs for the executive bar chart. */
export type ReportsRevenueCostChart = {
  readonly labels: readonly string[];
  readonly tooltipLabels: readonly string[];
  readonly revenueCents: readonly number[];
  readonly costsCents: readonly number[];
};

export type ReportsFinancialActivityItem = {
  readonly id: string;
  readonly occurredAt: string;
  readonly displayAt: string;
  readonly projectSlug: string;
  readonly projectName: string;
  /** One-line feed text, e.g. "$5,000 payment received — Daniel House". */
  readonly summary: string;
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
    readonly avgDaysToPay: number | null;
  };
  readonly activeProjects: ReportsKpiCard & {
    readonly count: number;
    readonly waitingApprovalCount: number;
    readonly overdueProjectCount: number;
  };
  readonly pipelineValue: ReportsKpiCard & {
    readonly unpaidCents: number;
    readonly activeProjectCount: number;
  };
  readonly revenueCostChart: ReportsRevenueCostChart;
  readonly projectRows: readonly ReportsProjectRow[];
  readonly costBreakdown: readonly ReportsCostBreakdownRow[];
  readonly costsIncludeUndatedEntries: boolean;
  readonly recentActivity: readonly ReportsFinancialActivityItem[];
};
