import type { ReportPeriodId, ReportPeriodRange } from '../types/crmReportsDashboard';

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

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

export function resolveReportPeriodRange(
  period: ReportPeriodId,
  now: Date = new Date()
): ReportPeriodRange {
  const end = now;
  let start: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case 'mtd': {
      start = startOfMonth(now);
      previousEnd = new Date(start.getTime() - 1);
      previousStart = startOfMonth(previousEnd);
      break;
    }
    case 'qtd': {
      start = startOfQuarter(now);
      const prevQuarterEnd = new Date(start.getTime() - 1);
      previousStart = startOfQuarter(prevQuarterEnd);
      previousEnd = prevQuarterEnd;
      break;
    }
    case 'ytd': {
      start = startOfYear(now);
      previousEnd = new Date(start.getTime() - 1);
      previousStart = startOfYear(previousEnd);
      break;
    }
    case 'all':
    default: {
      start = new Date(2000, 0, 1);
      previousStart = new Date(2000, 0, 1);
      previousEnd = new Date(2000, 0, 1);
      break;
    }
  }

  return { period, start, end, previousStart, previousEnd };
}

export function isTimestampInRange(
  iso: string | null | undefined,
  start: Date,
  end: Date
): boolean {
  if (iso == null) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t <= end.getTime();
}

export type TimeBucket = {
  readonly label: string;
  readonly start: Date;
  readonly end: Date;
};

export function buildTimeBuckets(range: ReportPeriodRange): readonly TimeBucket[] {
  const { start, end, period } = range;
  const buckets: TimeBucket[] = [];

  if (period === 'all') {
    const cursor = startOfMonth(start);
    const endMonth = startOfMonth(end);
    while (cursor <= endMonth) {
      const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        start: new Date(cursor),
        end: bucketEnd > end ? end : bucketEnd,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets.length > 0 ? buckets : [{ label: 'All', start, end }];
  }

  const spanDays = daysBetween(start, end);
  if (period === 'mtd' || spanDays <= 45) {
    const cursor = startOfDay(start);
    const endDay = startOfDay(end);
    while (cursor <= endDay) {
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      buckets.push({
        label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        start: new Date(cursor),
        end: dayEnd,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }

  const cursor = startOfMonth(start);
  const endMonth = startOfMonth(end);
  while (cursor <= endMonth) {
    const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    buckets.push({
      label: cursor.toLocaleDateString('en-US', { month: 'short' }),
      start: new Date(cursor),
      end: bucketEnd > end ? end : bucketEnd,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets.length > 0 ? buckets : [{ label: 'Period', start, end }];
}

export function computePeriodComparison(
  currentCents: number,
  previousCents: number,
  period: ReportPeriodId
): { percent: number | null; label: string } {
  if (period === 'all') {
    return { percent: null, label: 'All-time view — no prior period comparison' };
  }
  if (previousCents === 0) {
    return {
      percent: currentCents > 0 ? 100 : null,
      label: currentCents > 0 ? 'vs prior period (from $0)' : 'vs prior period — no prior activity',
    };
  }
  const percent = ((currentCents - previousCents) / previousCents) * 100;
  return { percent, label: 'vs prior period' };
}
