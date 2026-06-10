import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import { buildProjectProfitAndLossReportData } from '../builders/buildProjectProfitAndLossReportData';
import type { ProjectFinancialReportContext } from '../types/projectFinancialReport';
import { downloadBlob } from './downloadBlob';
import { projectProfitAndLossPdfFilename } from './projectProfitAndLossPdfFilename';
import { renderProjectProfitAndLossPdf } from './renderProjectProfitAndLossPdf';

export type ExportProjectFinancialReportOptions = {
  readonly childSummaries?: readonly CrmProjectSummary[] | null;
  readonly paymentTasksIndex?: CrmProjectPaymentTasksIndex;
  readonly budgetEntriesIndex?: CrmProjectBudgetEntriesIndex;
};

export async function exportProjectProfitAndLossPdf(
  project: CrmProjectDetail,
  context: ProjectFinancialReportContext,
  options: ExportProjectFinancialReportOptions = {}
): Promise<void> {
  const reportData = buildProjectProfitAndLossReportData(project, context, new Date(), options);
  const blob = await renderProjectProfitAndLossPdf(reportData);
  downloadBlob(blob, projectProfitAndLossPdfFilename(project.summary.slug));
}
