import type { ReportPeriodId } from '../types/crmReportsDashboard';

const PERIOD_SLUG: Record<ReportPeriodId, string> = {
  mtd: 'mtd',
  qtd: 'qtd',
  ytd: 'ytd',
  all: 'all-time',
};

export function crmReportsSummaryPdfFilename(
  period: ReportPeriodId,
  date: Date = new Date()
): string {
  const isoDate = date.toISOString().slice(0, 10);
  return `buildcore-report-${PERIOD_SLUG[period]}-${isoDate}.pdf`;
}
