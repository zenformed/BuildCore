import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import {
  collectRollupBudgetSummary,
  type CrmProjectBudgetEntriesIndex,
} from '@/domain/crm/projectBudgetRollup';
import {
  computePaymentFinancialsFromTasks,
  computePaymentFinancialsWithChildren,
  getPaymentTasksForProject,
  type CrmProjectPaymentTasksIndex,
} from '@/domain/crm/projectPaymentValue';
import { buildBudgetCategoryPieSlices } from '../charts/budgetCategoryChartModel';
import { computeCategoryPercentOfTotal } from '../calculations/profitAndLossCalculations';
import { formatReportDateTime, formatReportText } from '../formatReportValues';
import { reportBudgetCategoryLabel } from '../labels/reportLabels';
import type {
  ProjectFinancialReportContext,
  ProjectFinancialReportData,
} from '../types/projectFinancialReport';
import { buildProjectProfitAndLossReportTitle } from './buildProjectProfitAndLossReportTitle';
import { collectProjectFinancialReportPayments } from './collectProjectFinancialReportPayments';

export type BuildProjectFinancialReportInput = {
  readonly project: CrmProjectDetail;
  readonly childSummaries: readonly CrmProjectSummary[] | null;
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
  readonly budgetEntriesIndex: CrmProjectBudgetEntriesIndex;
  readonly context: ProjectFinancialReportContext;
  readonly generatedAt?: Date;
};

function toPaymentBalanceTasks(
  workflowTasks: CrmProjectDetail['workflowTasks']
): ReturnType<typeof getPaymentTasksForProject> {
  return workflowTasks
    .filter((task) => task.amountCents != null)
    .map((task) => ({
      amountCents: task.amountCents,
      status: task.status,
      paidAt: task.paidAt ?? null,
      title: task.title,
      id: task.id,
    }));
}

export function buildProjectFinancialReportData(
  input: BuildProjectFinancialReportInput
): ProjectFinancialReportData {
  const { project, childSummaries, paymentTasksIndex, budgetEntriesIndex, context } = input;
  const generatedAt = input.generatedAt ?? new Date();
  const generatedAtIso = generatedAt.toISOString();
  const { summary, budget } = project;
  const isParentRollup = summary.parentProjectId == null && childSummaries != null;
  const rollupBudget = isParentRollup
    ? collectRollupBudgetSummary(budget, childSummaries ?? [], budgetEntriesIndex)
    : budget;

  const ownTasks = toPaymentBalanceTasks(project.workflowTasks);
  const paymentFinancials = isParentRollup
    ? computePaymentFinancialsWithChildren(
        ownTasks,
        (childSummaries ?? []).map((child) =>
          getPaymentTasksForProject(paymentTasksIndex, child.id)
        )
      )
    : computePaymentFinancialsFromTasks(ownTasks);

  const costsCents = rollupBudget.totalCostCents;
  const financialSummary = {
    valueCents: paymentFinancials.valueCents,
    collectedCents: paymentFinancials.collectedCents,
    balanceCents: paymentFinancials.balanceCents,
    costsCents,
    actualProfitCents: paymentFinancials.collectedCents - costsCents,
    projectedProfitCents: paymentFinancials.valueCents - costsCents,
  };

  const payments = collectProjectFinancialReportPayments({
    project,
    childSummaries,
    paymentTasksIndex,
  });

  const { slices } = buildBudgetCategoryPieSlices(rollupBudget.categoryCosts);
  const totalCostCents = rollupBudget.totalCostCents;

  const costRows = slices.map((slice) => ({
    categoryLabel: reportBudgetCategoryLabel(slice.row.category),
    costCents: slice.row.costCents,
    percentOfTotalCost: computeCategoryPercentOfTotal(slice.row.costCents, totalCostCents),
    itemCount: rollupBudget.entries.filter((entry) => entry.category === slice.row.category).length,
    color: slice.color,
  }));

  const categoryTotals = costRows.map((row) => ({
    categoryLabel: row.categoryLabel,
    costCents: row.costCents,
    percentOfTotalCost: row.percentOfTotalCost,
    color: row.color,
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
    isParentRollup,
    budgetCategoryCosts: rollupBudget.categoryCosts,

    customerName: formatReportText(summary.client.name),
    contactName: formatReportText(summary.contact.name),
    contactEmail: formatReportText(summary.contact.email),
    contactPhone: formatReportText(summary.contact.phone),

    financialSummary,
    payments,
    costRows,
    categoryTotals,
    pieSlices,
  };
}
