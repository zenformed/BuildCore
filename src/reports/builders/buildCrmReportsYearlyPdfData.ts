import type { CrmProjectDetail } from '@/domain/crm';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBuildCoreDisplayDateTimeFromDate } from '@/platform/formatting/buildCoreDisplayDate';
import { aggregateReportsMonthlyFinancials } from '../calculations/aggregateReportsMonthlyFinancials';
import { computeReportsPeriodFinancials } from '../calculations/reportsPeriodFinancials';
import { resolveReportExportPeriod } from '../periods/resolveReportExportPeriod';
import type {
  CrmReportsYearlyPdfContext,
  CrmReportsYearlyPdfData,
  CrmReportsYearlyPdfHighlight,
} from '../types/crmReportsYearlyPdf';

const pdf = content.reports.yearlyPdf;

function formatGeneratedAt(date: Date): string {
  return formatBuildCoreDisplayDateTimeFromDate(date);
}

export function buildCrmReportsYearlyPdfData(
  projects: readonly CrmProjectDetail[],
  context: CrmReportsYearlyPdfContext,
  now: Date = new Date()
): CrmReportsYearlyPdfData {
  const period = resolveReportExportPeriod(context.type, context.year);
  const yearlySummary = computeReportsPeriodFinancials(
    projects,
    period.start,
    period.end,
    period.end
  );
  const monthlyRows = aggregateReportsMonthlyFinancials(projects, context.year);

  const monthHighlights: CrmReportsYearlyPdfHighlight[] = monthlyRows
    .filter((row) => row.hasActivity)
    .map((row) => ({
      monthLabel: row.monthLabel,
      collectedCents: row.collectedCents,
      invoicedCents: row.invoicedCents,
      costsCents: row.costsCents,
      netProfitCents: row.netProfitCents,
      marginPercent: row.marginPercent,
      paymentCount: row.paymentCount,
      topProjectName: row.topProjectName,
    }));

  const organizationName =
    context.organizationName.trim() || buildcoreAppDefinition.displayName;

  return {
    organizationName,
    reportTitle: pdf.reportTitle,
    reportType: context.type,
    year: context.year,
    generatedAtLabel: formatGeneratedAt(now),
    yearlySummary,
    monthlyRows,
    monthHighlights,
  };
}
