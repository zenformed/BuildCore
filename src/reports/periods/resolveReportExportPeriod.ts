import type { ReportExportPeriodRange, ReportExportTypeId } from '../types/reportExport';

function endOfYear(year: number): Date {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

function startOfYear(year: number): Date {
  return new Date(year, 0, 1, 0, 0, 0, 0);
}

export function resolveFullYearExportPeriod(year: number): ReportExportPeriodRange {
  return {
    type: 'full_year',
    year,
    start: startOfYear(year),
    end: endOfYear(year),
  };
}

/**
 * Resolves export period for PDF generation. Only `full_year` is implemented in this pass.
 */
export function resolveReportExportPeriod(
  type: ReportExportTypeId,
  year: number
): ReportExportPeriodRange {
  switch (type) {
    case 'full_year':
      return resolveFullYearExportPeriod(year);
    case 'mtd':
    case 'qtd':
    case 'ytd':
    case 'custom_range':
    default:
      throw new Error(`Report export type "${type}" is not implemented yet.`);
  }
}
