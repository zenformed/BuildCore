import {
  CRM_BUDGET_CATEGORIES,
  isPaymentWorkflowTask,
  type CrmBudgetCategory,
  type CrmProjectDetail,
} from '@/domain/crm';
import type {
  CrmReportsDashboardData,
  ReportChartTabId,
  ReportPeriodId,
  ReportsKpiCard,
} from '../types/crmReportsDashboard';
import {
  buildChartTimeBuckets,
  resolveChartActivityStart,
  type ChartTimeBucket,
} from './reportChartBuckets';
import { buildReportsFinancialActivity } from './reportsFinancialActivity';
import {
  collectPaymentTasks,
  resolveCostIncurredAtForReporting,
  sumCollectedInRange,
  sumCostsInRange,
} from './reportsFinancialMetrics';
import { computeCategoryPercentOfTotal } from './profitAndLossCalculations';
import {
  computePeriodComparison,
  isTimestampInRange,
  resolveReportPeriodRange,
} from './reportPeriodRange';

function countCollectedInRange(
  payments: ReturnType<typeof collectPaymentTasks>,
  start: Date,
  end: Date
): number {
  let count = 0;
  for (const p of payments) {
    if (isTimestampInRange(p.paidAt, start, end)) count += 1;
  }
  return count;
}

function sumInvoicedInRange(
  payments: ReturnType<typeof collectPaymentTasks>,
  start: Date,
  end: Date
): number {
  let total = 0;
  for (const p of payments) {
    if (!isTimestampInRange(p.invoicedAt, start, end)) continue;
    total += p.amountCents ?? 0;
  }
  return total;
}

/** Open receivables: invoiced but not paid (point-in-time, not period-filtered). */
function sumOpenReceivables(payments: ReturnType<typeof collectPaymentTasks>): {
  totalCents: number;
  unpaidCount: number;
  overdueCount: number;
} {
  let totalCents = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  const now = Date.now();
  for (const p of payments) {
    if (p.invoicedAt == null || p.paidAt != null) continue;
    totalCents += p.amountCents ?? 0;
    unpaidCount += 1;
    if (p.dueAt != null) {
      const due = new Date(p.dueAt).getTime();
      if (!Number.isNaN(due) && due < now) overdueCount += 1;
    }
  }
  return { totalCents, unpaidCount, overdueCount };
}

function buildKpiCard(
  mainCents: number,
  previousCents: number,
  period: ReportPeriodId,
  footLeft: string,
  footRight: string
): ReportsKpiCard {
  const comparison = computePeriodComparison(mainCents, previousCents, period);
  return { mainCents, comparison, footLeft, footRight };
}

function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatMarginPercent(profitCents: number, collectedCents: number): number | null {
  if (collectedCents <= 0) return null;
  return (profitCents / collectedCents) * 100;
}

function bucketValueForTab(
  tab: ReportChartTabId,
  payments: ReturnType<typeof collectPaymentTasks>,
  projects: readonly CrmProjectDetail[],
  bucket: ChartTimeBucket
): number {
  const { start, end } = bucket;
  switch (tab) {
    case 'revenue':
      return sumCollectedInRange(payments, start, end);
    case 'costs':
      return sumCostsInRange(projects, start, end).totalCents;
    case 'profit': {
      const collected = sumCollectedInRange(payments, start, end);
      const costs = sumCostsInRange(projects, start, end).totalCents;
      return collected - costs;
    }
    case 'receivables':
      return sumInvoicedInRange(payments, start, end);
    default:
      return 0;
  }
}

function computeAvgDaysToPay(payments: ReturnType<typeof collectPaymentTasks>): number | null {
  const deltas: number[] = [];
  for (const p of payments) {
    if (p.invoicedAt == null || p.paidAt == null) continue;
    const inv = new Date(p.invoicedAt).getTime();
    const paid = new Date(p.paidAt).getTime();
    if (Number.isNaN(inv) || Number.isNaN(paid) || paid < inv) continue;
    deltas.push((paid - inv) / 86_400_000);
  }
  if (deltas.length < 2) return null;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

export function computeCrmReportsDashboard(
  projects: readonly CrmProjectDetail[],
  period: ReportPeriodId,
  chartTab: ReportChartTabId
): CrmReportsDashboardData {
  const range = resolveReportPeriodRange(period);
  const payments = collectPaymentTasks(projects);

  const collectedCents = sumCollectedInRange(payments, range.start, range.end);
  const prevCollectedCents = sumCollectedInRange(payments, range.previousStart, range.previousEnd);
  const collectedCount = countCollectedInRange(payments, range.start, range.end);
  const avgPaymentCents = collectedCount > 0 ? Math.round(collectedCents / collectedCount) : 0;

  const receivablesNow = sumOpenReceivables(payments);
  const prevInvoicedInPeriod = sumInvoicedInRange(
    payments,
    range.previousStart,
    range.previousEnd
  );

  const { totalCents: costsCents, usedLegacyCreatedAtFallback } = sumCostsInRange(
    projects,
    range.start,
    range.end
  );
  const { totalCents: prevCostsCents } = sumCostsInRange(
    projects,
    range.previousStart,
    range.previousEnd
  );
  const profitCents = collectedCents - costsCents;
  const prevProfitCents = prevCollectedCents - prevCostsCents;
  const marginPercent = formatMarginPercent(profitCents, collectedCents);

  const chartActivityStart = resolveChartActivityStart(projects);
  const chartBuckets = buildChartTimeBuckets(range, chartActivityStart);
  const chartValues = chartBuckets.map((b) =>
    bucketValueForTab(chartTab, payments, projects, b)
  );

  const avgDaysToPay = computeAvgDaysToPay(payments);
  const now = Date.now();

  const projectRows = projects.map((project) => {
    const projectPayments = project.workflowTasks.filter(isPaymentWorkflowTask);
    const rowCollected = sumCollectedInRange(projectPayments, range.start, range.end);
    const { totalCents: rowCosts } = sumCostsInRange([project], range.start, range.end);
    const rowProfit = rowCollected - rowCosts;
    const rowMargin = formatMarginPercent(rowProfit, rowCollected);
    const isCompleted = project.summary.completedAt != null;
    const isWaitingApproval =
      !isCompleted && project.summary.currentStageSlug === 'waiting-on-approval';
    const isActive = !isCompleted;
    const hasOverduePayments = projectPayments.some((task) => {
      if (task.invoicedAt == null || task.paidAt != null || task.dueAt == null) return false;
      const dueMs = new Date(task.dueAt).getTime();
      return !Number.isNaN(dueMs) && dueMs < now;
    });
    const statusLabel = isCompleted
      ? 'Completed'
      : isWaitingApproval
        ? 'Waiting Approval'
        : 'Active';
    return {
      projectId: project.summary.id,
      slug: project.summary.slug,
      label: project.summary.name,
      collectedCents: rowCollected,
      costsCents: rowCosts,
      profitCents: rowProfit,
      marginPercent: rowMargin,
      statusLabel,
      isCompleted,
      isActive,
      isWaitingApproval,
      hasOverduePayments,
    };
  });

  const costByCategory = new Map<CrmBudgetCategory, number>();
  for (const project of projects) {
    for (const entry of project.budget.entries) {
      const { iso } = resolveCostIncurredAtForReporting(entry);
      if (!isTimestampInRange(iso, range.start, range.end)) continue;
      costByCategory.set(
        entry.category,
        (costByCategory.get(entry.category) ?? 0) + entry.costCents
      );
    }
  }

  const totalCostCents = [...costByCategory.values()].reduce((sum, cents) => sum + cents, 0);
  const costBreakdown = CRM_BUDGET_CATEGORIES.filter(
    (cat) => (costByCategory.get(cat) ?? 0) > 0
  ).map((category) => {
    const costCents = costByCategory.get(category) ?? 0;
    return {
      category,
      costCents,
      costPercent: computeCategoryPercentOfTotal(costCents, totalCostCents),
    };
  });

  return {
    period,
    collected: {
      ...buildKpiCard(
        collectedCents,
        prevCollectedCents,
        period,
        `${collectedCount} payments`,
        `Avg ${formatUsdFromCents(avgPaymentCents)}`
      ),
      paymentCount: collectedCount,
      avgPaymentCents,
    },
    receivables: {
      ...buildKpiCard(
        receivablesNow.totalCents,
        prevInvoicedInPeriod,
        period,
        `${receivablesNow.unpaidCount} unpaid`,
        `${receivablesNow.overdueCount} overdue`
      ),
      unpaidCount: receivablesNow.unpaidCount,
      overdueCount: receivablesNow.overdueCount,
    },
    netProfit: {
      ...buildKpiCard(
        profitCents,
        prevProfitCents,
        period,
        marginPercent != null ? `Margin ${formatPercent(marginPercent)}` : 'Margin —',
        avgDaysToPay != null ? `${avgDaysToPay.toFixed(1)} days` : '—'
      ),
      marginPercent,
      avgDaysToPay,
    },
    chart: {
      labels: chartBuckets.map((b) => b.label),
      tooltipLabels: chartBuckets.map((b) => b.tooltipLabel),
      valuesCents: chartValues,
    },
    projectRows: [...projectRows].sort((a, b) => b.collectedCents - a.collectedCents),
    costBreakdown,
    costsIncludeUndatedEntries: usedLegacyCreatedAtFallback,
    recentActivity: buildReportsFinancialActivity(projects, range.start, range.end),
  };
}
