import type { CrmProjectDetail } from '@/domain/crm';
import type { ReportExportContext } from '../types/reportExport';
import { exportCrmReportsYearlyPdf } from './exportCrmReportsYearlyPdf';

/** Routes PDF export by report type (extensible for future period exports). */
export async function exportCrmReportsPdf(
  projects: readonly CrmProjectDetail[],
  context: ReportExportContext
): Promise<void> {
  switch (context.type) {
    case 'full_year':
      await exportCrmReportsYearlyPdf(projects, {
        organizationName: context.organizationName,
        type: context.type,
        year: context.year,
      });
      return;
    case 'mtd':
    case 'qtd':
    case 'ytd':
    case 'custom_range':
    default:
      throw new Error(`Report export type "${context.type}" is not implemented yet.`);
  }
}
