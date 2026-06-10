import type { CrmBudgetCategoryCost } from '@/domain/crm';
import type { ReportCategoryTotalRow, ReportPieSlice, ReportScope } from '../types';

export type ProjectFinancialSummary = {
  readonly valueCents: number;
  readonly collectedCents: number;
  readonly balanceCents: number;
  readonly costsCents: number;
  readonly actualProfitCents: number;
  readonly projectedProfitCents: number;
};

export type ProjectFinancialReportPaymentRow = {
  readonly title: string;
  readonly projectLabel: string | null;
  readonly amountCents: number;
  readonly statusLabel: string;
  readonly paidAtLabel: string;
  readonly paidIndicator: 'paid' | 'unpaid';
};

export type ProjectFinancialReportCostRow = {
  readonly categoryLabel: string;
  readonly costCents: number;
  readonly percentOfTotalCost: number;
  readonly itemCount: number;
  readonly color: string;
};

export type ProjectFinancialReportContext = {
  readonly organizationName: string;
};

export type ProjectFinancialReportData = {
  readonly scope: ReportScope;
  readonly organizationName: string;
  readonly reportTitle: string;
  readonly projectName: string;
  readonly projectSlug: string;
  readonly generatedAtIso: string;
  readonly generatedAtLabel: string;
  readonly isParentRollup: boolean;
  readonly budgetCategoryCosts: readonly CrmBudgetCategoryCost[];

  readonly customerName: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;

  readonly financialSummary: ProjectFinancialSummary;
  readonly payments: readonly ProjectFinancialReportPaymentRow[];
  readonly costRows: readonly ProjectFinancialReportCostRow[];
  readonly categoryTotals: readonly ReportCategoryTotalRow[];
  readonly pieSlices: readonly ReportPieSlice[];
};
