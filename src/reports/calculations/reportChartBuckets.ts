import { isPaymentWorkflowTask, type CrmProjectDetail } from '@/domain/crm';
import type { ReportPeriodId, ReportPeriodRange } from '../types/crmReportsDashboard';
import { daysBetween } from './reportPeriodRange';

export type ChartBucketGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type ChartTimeBucket = {
  readonly label: string;
  readonly tooltipLabel: string;
  readonly granularity: ChartBucketGranularity;
  readonly start: Date;
  readonly end: Date;
};

const MAX_CHART_BUCKETS = 36;
const YEARS_FOR_QUARTERLY_ALL_TIME = 3;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

function startOfWeekMonday(date: Date): Date {
  const d = startOfDay(date);
  const weekday = d.getDay();
  const daysFromMonday = (weekday + 6) % 7;
  d.setDate(d.getDate() - daysFromMonday);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function endOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 3, 0, 23, 59, 59, 999);
}

function yearsBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (365.25 * 86_400_000);
}

function formatDaily(date: Date): { label: string; tooltipLabel: string } {
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, tooltipLabel: label };
}

function formatWeekly(weekStart: Date): { label: string; tooltipLabel: string } {
  const short = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label: short, tooltipLabel: `Week of ${short}` };
}

function formatMonthly(monthStart: Date, spanYears: number): { label: string; tooltipLabel: string } {
  const tooltipLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const label =
    spanYears > 1
      ? monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      : monthStart.toLocaleDateString('en-US', { month: 'short' });
  return { label, tooltipLabel };
}

function formatQuarterly(quarterStart: Date): { label: string; tooltipLabel: string } {
  const quarter = Math.floor(quarterStart.getMonth() / 3) + 1;
  const year = quarterStart.getFullYear();
  return { label: `Q${quarter}`, tooltipLabel: `Q${quarter} ${year}` };
}

export function resolveChartActivityStart(projects: readonly CrmProjectDetail[]): Date | null {
  let earliestMs: number | null = null;

  for (const project of projects) {
    for (const task of project.workflowTasks) {
      if (!isPaymentWorkflowTask(task)) continue;
      for (const iso of [task.paidAt, task.invoicedAt] as const) {
        if (iso == null) continue;
        const t = new Date(iso).getTime();
        if (Number.isNaN(t)) continue;
        earliestMs = earliestMs == null ? t : Math.min(earliestMs, t);
      }
    }
    for (const entry of project.budget.entries) {
      const incurredIso = entry.costIncurredAt || entry.createdAt;
      const t = new Date(incurredIso).getTime();
      if (Number.isNaN(t)) continue;
      earliestMs = earliestMs == null ? t : Math.min(earliestMs, t);
    }
  }

  return earliestMs == null ? null : new Date(earliestMs);
}

export function resolveChartBucketGranularity(
  range: ReportPeriodRange,
  chartStart: Date
): ChartBucketGranularity {
  const spanDays = daysBetween(chartStart, range.end);

  switch (range.period) {
    case 'mtd':
      return 'daily';
    case 'qtd':
      return spanDays > 45 ? 'weekly' : 'daily';
    case 'ytd':
      return 'monthly';
    case 'all':
      return yearsBetween(chartStart, range.end) > YEARS_FOR_QUARTERLY_ALL_TIME
        ? 'quarterly'
        : 'monthly';
    default:
      return 'monthly';
  }
}

function coarsenGranularity(granularity: ChartBucketGranularity): ChartBucketGranularity | null {
  switch (granularity) {
    case 'daily':
      return 'weekly';
    case 'weekly':
      return 'monthly';
    case 'monthly':
      return 'quarterly';
    case 'quarterly':
      return null;
    default:
      return null;
  }
}

function clampBucketEnd(candidateEnd: Date, rangeEnd: Date): Date {
  return candidateEnd > rangeEnd ? rangeEnd : candidateEnd;
}

function buildDailyBuckets(chartStart: Date, rangeEnd: Date): ChartTimeBucket[] {
  const buckets: ChartTimeBucket[] = [];
  const cursor = startOfDay(chartStart);
  const endDay = startOfDay(rangeEnd);

  while (cursor <= endDay) {
    const { label, tooltipLabel } = formatDaily(cursor);
    buckets.push({
      label,
      tooltipLabel,
      granularity: 'daily',
      start: new Date(cursor),
      end: clampBucketEnd(endOfDay(cursor), rangeEnd),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function buildWeeklyBuckets(chartStart: Date, rangeEnd: Date): ChartTimeBucket[] {
  const buckets: ChartTimeBucket[] = [];
  const cursor = startOfWeekMonday(chartStart);
  const endMs = rangeEnd.getTime();

  while (cursor.getTime() <= endMs) {
    const weekEnd = endOfDay(new Date(cursor));
    weekEnd.setDate(weekEnd.getDate() + 6);
    const { label, tooltipLabel } = formatWeekly(cursor);
    buckets.push({
      label,
      tooltipLabel,
      granularity: 'weekly',
      start: new Date(cursor),
      end: clampBucketEnd(weekEnd, rangeEnd),
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  return buckets;
}

function buildMonthlyBuckets(chartStart: Date, rangeEnd: Date): ChartTimeBucket[] {
  const buckets: ChartTimeBucket[] = [];
  const cursor = startOfMonth(chartStart);
  const endMonth = startOfMonth(rangeEnd);
  const spanYears = yearsBetween(chartStart, rangeEnd);

  while (cursor <= endMonth) {
    const { label, tooltipLabel } = formatMonthly(cursor, spanYears);
    buckets.push({
      label,
      tooltipLabel,
      granularity: 'monthly',
      start: new Date(cursor),
      end: clampBucketEnd(endOfMonth(cursor), rangeEnd),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

function buildQuarterlyBuckets(chartStart: Date, rangeEnd: Date): ChartTimeBucket[] {
  const buckets: ChartTimeBucket[] = [];
  const cursor = startOfQuarter(chartStart);
  const endQuarter = startOfQuarter(rangeEnd);

  while (cursor <= endQuarter) {
    const { label, tooltipLabel } = formatQuarterly(cursor);
    buckets.push({
      label,
      tooltipLabel,
      granularity: 'quarterly',
      start: new Date(cursor),
      end: clampBucketEnd(endOfQuarter(cursor), rangeEnd),
    });
    cursor.setMonth(cursor.getMonth() + 3);
  }

  return buckets;
}

function buildBucketsForGranularity(
  granularity: ChartBucketGranularity,
  chartStart: Date,
  rangeEnd: Date
): ChartTimeBucket[] {
  switch (granularity) {
    case 'daily':
      return buildDailyBuckets(chartStart, rangeEnd);
    case 'weekly':
      return buildWeeklyBuckets(chartStart, rangeEnd);
    case 'monthly':
      return buildMonthlyBuckets(chartStart, rangeEnd);
    case 'quarterly':
      return buildQuarterlyBuckets(chartStart, rangeEnd);
    default:
      return [];
  }
}

function mergeBucketGroup(group: readonly ChartTimeBucket[]): ChartTimeBucket {
  const start = group[0].start;
  const end = group[group.length - 1].end;
  const granularity = group[0].granularity;

  if (group.length === 1) {
    return group[0];
  }

  const first = group[0];
  const last = group[group.length - 1];

  if (granularity === 'daily' || granularity === 'weekly') {
    return {
      granularity,
      start,
      end,
      label: first.label,
      tooltipLabel: `${first.tooltipLabel} – ${last.tooltipLabel}`,
    };
  }

  if (granularity === 'monthly') {
    return {
      granularity,
      start,
      end,
      label: `${first.label}–${last.label}`,
      tooltipLabel: `${first.tooltipLabel} – ${last.tooltipLabel}`,
    };
  }

  return {
    granularity,
    start,
    end,
    label: `${first.label}–${last.label}`,
    tooltipLabel: `${first.tooltipLabel} – ${last.tooltipLabel}`,
  };
}

function capChartBucketCount(buckets: readonly ChartTimeBucket[], max: number): ChartTimeBucket[] {
  if (buckets.length <= max) return [...buckets];

  const groupSize = Math.ceil(buckets.length / max);
  const merged: ChartTimeBucket[] = [];

  for (let i = 0; i < buckets.length; i += groupSize) {
    merged.push(mergeBucketGroup(buckets.slice(i, i + groupSize)));
  }

  return merged;
}

export function resolveChartRangeStart(
  range: ReportPeriodRange,
  activityStart: Date | null
): Date {
  if (range.period !== 'all' || activityStart == null) {
    return range.start;
  }
  return startOfMonth(activityStart);
}

/** Adaptive chart buckets for display only (KPI totals use full period range). */
export function buildChartTimeBuckets(
  range: ReportPeriodRange,
  activityStart: Date | null = null
): readonly ChartTimeBucket[] {
  const chartStart = resolveChartRangeStart(range, activityStart);
  let granularity = resolveChartBucketGranularity(range, chartStart);
  let buckets = buildBucketsForGranularity(granularity, chartStart, range.end);

  while (buckets.length > MAX_CHART_BUCKETS) {
    const next = coarsenGranularity(granularity);
    if (next == null) break;
    granularity = next;
    buckets = buildBucketsForGranularity(granularity, chartStart, range.end);
  }

  if (buckets.length > MAX_CHART_BUCKETS) {
    return capChartBucketCount(buckets, MAX_CHART_BUCKETS);
  }

  if (buckets.length === 0) {
    return [
      {
        label: 'Period',
        tooltipLabel: 'Period',
        granularity: 'daily',
        start: chartStart,
        end: range.end,
      },
    ];
  }

  return buckets;
}

export { MAX_CHART_BUCKETS };
