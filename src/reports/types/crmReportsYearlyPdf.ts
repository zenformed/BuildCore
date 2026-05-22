import type { ReportExportTypeId } from './reportExport';
import type { ReportsMonthlyFinancialRow } from '../calculations/aggregateReportsMonthlyFinancials';
import type { ReportsPeriodFinancialSnapshot } from '../calculations/reportsPeriodFinancials';

export type CrmReportsYearlyPdfHighlight = {
  readonly monthLabel: string;
  readonly collectedCents: number;
  readonly invoicedCents: number;
  readonly costsCents: number;
  readonly netProfitCents: number;
  readonly marginPercent: number | null;
  readonly paymentCount: number;
  readonly topProjectName: string | null;
};

export type CrmReportsYearlyPdfData = {
  readonly organizationName: string;
  readonly reportTitle: string;
  readonly reportType: ReportExportTypeId;
  readonly year: number;
  readonly generatedAtLabel: string;
  readonly yearlySummary: ReportsPeriodFinancialSnapshot;
  readonly monthlyRows: readonly ReportsMonthlyFinancialRow[];
  readonly monthHighlights: readonly CrmReportsYearlyPdfHighlight[];
};

export type CrmReportsYearlyPdfContext = {
  readonly organizationName: string;
  readonly type: ReportExportTypeId;
  readonly year: number;
};
