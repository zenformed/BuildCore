import type { ReportExportTypeId } from '../types/reportExport';

const TYPE_SLUG: Record<ReportExportTypeId, string> = {
  full_year: 'full-year',
  mtd: 'mtd',
  qtd: 'qtd',
  ytd: 'ytd',
  custom_range: 'custom-range',
};

export function crmReportsYearlyPdfFilename(
  type: ReportExportTypeId,
  year: number,
  date: Date = new Date()
): string {
  const isoDate = date.toISOString().slice(0, 10);
  return `buildcore-financial-report-${TYPE_SLUG[type]}-${year}-${isoDate}.pdf`;
}
