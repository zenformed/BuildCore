import type { CrmProjectDetail } from '@/domain/crm';
import { buildCrmReportsSummaryPdfData } from '../builders/buildCrmReportsSummaryPdfData';
import type { CrmReportsSummaryPdfContext } from '../types/crmReportsSummaryPdf';
import { crmReportsSummaryPdfFilename } from './crmReportsSummaryPdfFilename';
import { downloadBlob } from './downloadBlob';
import { renderCrmReportsSummaryPdf } from './renderCrmReportsSummaryPdf';

export async function exportCrmReportsSummaryPdf(
  projects: readonly CrmProjectDetail[],
  context: CrmReportsSummaryPdfContext
): Promise<void> {
  const reportData = buildCrmReportsSummaryPdfData(projects, context);
  const blob = await renderCrmReportsSummaryPdf(reportData);
  downloadBlob(blob, crmReportsSummaryPdfFilename(context.periodId));
}
