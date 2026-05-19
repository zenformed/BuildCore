import type { CrmProjectDetail } from '@/domain/crm';
import { buildProjectProfitAndLossReportData } from '../builders/buildProjectProfitAndLossReportData';
import type { ProjectProfitAndLossReportContext } from '../types';
import { downloadBlob } from './downloadBlob';
import { projectProfitAndLossPdfFilename } from './projectProfitAndLossPdfFilename';
import { renderProjectProfitAndLossPdf } from './renderProjectProfitAndLossPdf';

export async function exportProjectProfitAndLossPdf(
  project: CrmProjectDetail,
  context: ProjectProfitAndLossReportContext
): Promise<void> {
  const reportData = buildProjectProfitAndLossReportData(project, context);
  const blob = await renderProjectProfitAndLossPdf(reportData);
  downloadBlob(blob, projectProfitAndLossPdfFilename(project.summary.slug));
}
