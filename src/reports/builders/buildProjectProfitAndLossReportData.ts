import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import { buildProjectFinancialReportData } from './buildProjectFinancialReportData';
import type { ProjectFinancialReportContext, ProjectFinancialReportData } from '../types/projectFinancialReport';

/** @deprecated Use ProjectFinancialReportContext */
export type ProjectProfitAndLossReportContext = ProjectFinancialReportContext;

/** @deprecated Use ProjectFinancialReportData */
export type ProjectProfitAndLossReportData = ProjectFinancialReportData;

export function buildProjectProfitAndLossReportData(
  project: CrmProjectDetail,
  context: ProjectFinancialReportContext,
  generatedAt: Date = new Date(),
  options: {
    readonly childSummaries?: readonly CrmProjectSummary[] | null;
    readonly paymentTasksIndex?: CrmProjectPaymentTasksIndex;
    readonly budgetEntriesIndex?: CrmProjectBudgetEntriesIndex;
  } = {}
): ProjectFinancialReportData {
  return buildProjectFinancialReportData({
    project,
    childSummaries: options.childSummaries ?? null,
    paymentTasksIndex: options.paymentTasksIndex ?? new Map(),
    budgetEntriesIndex: options.budgetEntriesIndex ?? new Map(),
    context,
    generatedAt,
  });
}
