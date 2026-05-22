import type { CrmProjectDetail } from '@/domain/crm';
import { buildCrmReportsYearlyPdfData } from '../builders/buildCrmReportsYearlyPdfData';
import type { CrmReportsYearlyPdfContext } from '../types/crmReportsYearlyPdf';
import { crmReportsYearlyPdfFilename } from './crmReportsYearlyPdfFilename';
import { downloadBlob } from './downloadBlob';
import { renderCrmReportsYearlyPdf } from './renderCrmReportsYearlyPdf';

export async function exportCrmReportsYearlyPdf(
  projects: readonly CrmProjectDetail[],
  context: CrmReportsYearlyPdfContext
): Promise<void> {
  const reportData = buildCrmReportsYearlyPdfData(projects, context);
  const blob = await renderCrmReportsYearlyPdf(reportData);
  downloadBlob(blob, crmReportsYearlyPdfFilename(context.type, context.year));
}
