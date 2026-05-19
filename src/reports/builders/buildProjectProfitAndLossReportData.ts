import type { CrmProjectDetail } from '@/domain/crm';
import { buildBudgetCategoryPieSlices } from '../charts/budgetCategoryChartModel';
import {
  computeCategoryPercentOfTotal,
  computeProfitAndLossMetrics,
} from '../calculations/profitAndLossCalculations';
import { computePaymentRevenueFromWorkflowTasks } from '../calculations/paymentRevenueCalculations';
import { formatReportDateTime, formatReportText } from '../formatReportValues';
import { reportBudgetCategoryLabel } from '../labels/reportLabels';
import type { ProjectProfitAndLossReportContext, ProjectProfitAndLossReportData } from '../types';
import { buildProjectProfitAndLossReportTitle } from './buildProjectProfitAndLossReportTitle';

export function buildProjectProfitAndLossReportData(
  project: CrmProjectDetail,
  context: ProjectProfitAndLossReportContext,
  generatedAt: Date = new Date()
): ProjectProfitAndLossReportData {
  const { summary, budget, workflowTasks } = project;
  const generatedAtIso = generatedAt.toISOString();
  const paymentRevenue = computePaymentRevenueFromWorkflowTasks(workflowTasks);
  const metrics = computeProfitAndLossMetrics({
    ...paymentRevenue,
    totalBudgetCents: budget.totalBudgetCents,
    totalCostCents: budget.totalCostCents,
  });

  const { slices } = buildBudgetCategoryPieSlices(budget.categoryCosts);
  const totalCostCents = budget.totalCostCents;

  const lineItems = budget.entries.map((entry) => ({
    itemName: entry.itemName,
    categoryLabel: reportBudgetCategoryLabel(entry.category),
    costCents: entry.costCents,
    budgetCents: entry.budgetCents,
    remainingCents: entry.budgetCents - entry.costCents,
    documentCount: entry.documentCount,
  }));

  const categoryTotals = slices.map((slice) => ({
    categoryLabel: reportBudgetCategoryLabel(slice.row.category),
    costCents: slice.row.costCents,
    percentOfTotalCost: computeCategoryPercentOfTotal(slice.row.costCents, totalCostCents),
    color: slice.color,
  }));

  const pieSlices = slices.map((slice) => ({
    label: reportBudgetCategoryLabel(slice.row.category),
    costCents: slice.row.costCents,
    color: slice.color,
    fraction: slice.fraction,
  }));

  return {
    scope: {
      kind: 'project',
      projectId: summary.id,
      projectSlug: summary.slug,
    },
    organizationName: context.organizationName.trim(),
    reportTitle: buildProjectProfitAndLossReportTitle(context.organizationName),
    projectName: summary.name,
    projectSlug: summary.slug,
    generatedAtIso,
    generatedAtLabel: formatReportDateTime(generatedAtIso, generatedAt),

    customerName: formatReportText(summary.client.name),
    contactName: formatReportText(summary.contact.name),
    contactEmail: formatReportText(summary.contact.email),
    contactPhone: formatReportText(summary.contact.phone),

    financial: metrics,

    lineItems,
    categoryTotals,
    pieSlices,
  };
}
