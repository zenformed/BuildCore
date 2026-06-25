import {
  CRM_BUDGET_CATEGORIES,
  isPaymentWorkflowTask,
  type CrmBudgetCategory,
  type CrmProjectDetail,
} from '@/domain/crm';
import {
  computeBalanceDueFromPayments,
  computeProjectValueFromPayments,
} from '@/domain/crm/projectPaymentValue';
import type {
  CrmReportsDashboardData,
  ReportPeriodId,
  ReportsKpiCard,
} from '../types/crmReportsDashboard';
import {
  buildChartTimeBuckets,
  resolveChartActivityStart,
} from './reportChartBuckets';
import { buildReportsFinancialActivity } from './reportsFinancialActivity';
import {
  collectPaymentTasks,
  computeMarginPercent,
  countCollectedInRange,
  resolveCostIncurredAtForReporting,
  sumCollectedInRange,
  sumCostsInRange,
  sumInvoicedInRange,
} from './reportsFinancialMetrics';
import { computeCategoryPercentOfTotal } from './profitAndLossCalculations';
import {
  computePeriodComparison,
  isTimestampInRange,
  resolveReportPeriodRange,
} from './reportPeriodRange';

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

function computeActiveProjectMetrics(projects: readonly CrmProjectDetail[]): {
  count: number;
  waitingApprovalCount: number;
  overdueProjectCount: number;
  pipelineCents: number;
  unpaidCents: number;
} {
  const now = Date.now();
  let count = 0;
  let waitingApprovalCount = 0;
  let overdueProjectCount = 0;
  let pipelineCents = 0;
  let unpaidCents = 0;

  for (const project of projects) {
    if (project.summary.completedAt != null) continue;
    count += 1;
    if (project.summary.currentStageSlug === 'waiting-on-approval') {
      waitingApprovalCount += 1;
    }
    const payments = project.workflowTasks.filter(isPaymentWorkflowTask);
    pipelineCents += computeProjectValueFromPayments(payments);
    unpaidCents += computeBalanceDueFromPayments(payments);
    const hasOverdue = payments.some((task) => {
      if (task.invoicedAt == null || task.paidAt != null || task.dueAt == null) return false;
      const dueMs = new Date(task.dueAt).getTime();
      return !Number.isNaN(dueMs) && dueMs < now;
    });
    if (hasOverdue) overdueProjectCount += 1;
  }

  return { count, waitingApprovalCount, overdueProjectCount, pipelineCents, unpaidCents };
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
  period: ReportPeriodId
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
  const marginPercent = computeMarginPercent(profitCents, collectedCents);

  const chartActivityStart = resolveChartActivityStart(projects);
  const chartBuckets = buildChartTimeBuckets(range, chartActivityStart);
  const revenueCents = chartBuckets.map((bucket) =>
    sumCollectedInRange(payments, bucket.start, bucket.end)
  );
  const costsCentsSeries = chartBuckets.map((bucket) =>
    sumCostsInRange(projects, bucket.start, bucket.end).totalCents
  );

  const activeMetrics = computeActiveProjectMetrics(projects);

  const avgDaysToPay = computeAvgDaysToPay(payments);
  const now = Date.now();
  const slugByProjectId = new Map(projects.map((project) => [project.summary.id, project.summary.slug]));

  const projectRows = projects.map((project) => {
    const projectPayments = project.workflowTasks.filter(isPaymentWorkflowTask);
    const rowCollected = sumCollectedInRange(projectPayments, range.start, range.end);
    const { totalCents: rowCosts } = sumCostsInRange([project], range.start, range.end);
    const rowProfit = rowCollected - rowCosts;
    const rowMargin = computeMarginPercent(rowProfit, rowCollected);
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
      parentProjectId: project.summary.parentProjectId,
      parentSlug:
        project.summary.parentProjectId != null
          ? (slugByProjectId.get(project.summary.parentProjectId) ?? null)
          : null,
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
  )
    .map((category) => {
      const costCents = costByCategory.get(category) ?? 0;
      return {
        category,
        costCents,
        costPercent: computeCategoryPercentOfTotal(costCents, totalCostCents),
      };
    })
    .sort((a, b) => b.costPercent - a.costPercent || b.costCents - a.costCents);

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
    activeProjects: {
      comparison: { percent: null, label: '' },
      footLeft: '',
      footRight: '',
      mainCents: activeMetrics.count,
      count: activeMetrics.count,
      waitingApprovalCount: activeMetrics.waitingApprovalCount,
      overdueProjectCount: activeMetrics.overdueProjectCount,
    },
    pipelineValue: {
      comparison: { percent: null, label: '' },
      footLeft: '',
      footRight: '',
      mainCents: activeMetrics.pipelineCents,
      unpaidCents: activeMetrics.unpaidCents,
      activeProjectCount: activeMetrics.count,
    },
    revenueCostChart: {
      labels: chartBuckets.map((b) => b.label),
      tooltipLabels: chartBuckets.map((b) => b.tooltipLabel),
      revenueCents,
      costsCents: costsCentsSeries,
    },
    projectRows,
    costBreakdown,
    costsIncludeUndatedEntries: usedLegacyCreatedAtFallback,
    recentActivity: buildReportsFinancialActivity(projects, range.start, range.end),
  };
}
