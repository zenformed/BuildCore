import type { CrmProjectDetail } from '@/domain/crm';
import type { CalendarMonthBucket } from '../periods/buildCalendarMonthBuckets';
import { buildCalendarMonthBuckets } from '../periods/buildCalendarMonthBuckets';
import {
  computeReportsPeriodFinancials,
  findTopProjectForPeriod,
  periodHasFinancialActivity,
  type ReportsPeriodFinancialSnapshot,
} from './reportsPeriodFinancials';

export type ReportsMonthlyFinancialRow = {
  readonly monthIndex: number;
  readonly monthLabel: string;
  readonly shortLabel: string;
  readonly collectedCents: number;
  readonly invoicedCents: number;
  readonly costsCents: number;
  readonly netProfitCents: number;
  readonly marginPercent: number | null;
  readonly paymentCount: number;
  readonly receivablesCents: number;
  readonly hasActivity: boolean;
  readonly topProjectName: string | null;
};

function toMonthlyRow(
  bucket: CalendarMonthBucket,
  snapshot: ReportsPeriodFinancialSnapshot,
  topProjectName: string | null
): ReportsMonthlyFinancialRow {
  return {
    monthIndex: bucket.monthIndex,
    monthLabel: bucket.label,
    shortLabel: bucket.shortLabel,
    collectedCents: snapshot.collectedCents,
    invoicedCents: snapshot.invoicedCents,
    costsCents: snapshot.costsCents,
    netProfitCents: snapshot.netProfitCents,
    marginPercent: snapshot.marginPercent,
    paymentCount: snapshot.paymentCount,
    receivablesCents: snapshot.receivablesCents,
    hasActivity: periodHasFinancialActivity(snapshot),
    topProjectName,
  };
}

export function aggregateReportsMonthlyFinancials(
  projects: readonly CrmProjectDetail[],
  year: number
): readonly ReportsMonthlyFinancialRow[] {
  const buckets = buildCalendarMonthBuckets(year);

  return buckets.map((bucket) => {
    const snapshot = computeReportsPeriodFinancials(
      projects,
      bucket.start,
      bucket.end,
      bucket.end
    );
    const topProject = findTopProjectForPeriod(projects, bucket.start, bucket.end);
    return toMonthlyRow(bucket, snapshot, topProject?.projectName ?? null);
  });
}
