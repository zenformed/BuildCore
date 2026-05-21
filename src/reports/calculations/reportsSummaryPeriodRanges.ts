export type ReportsSummaryColumnKey = 'mtd' | 'ytd' | 'lastYearMtd' | 'lastYearYtd';

export type ReportsSummaryColumnRange = {
  readonly key: ReportsSummaryColumnKey;
  readonly start: Date;
  readonly end: Date;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function shiftCalendarYear(date: Date, years: number): Date {
  return new Date(
    date.getFullYear() + years,
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
}

/** Calendar MTD / YTD and parallel prior-year periods for the summary PDF. */
export function resolveReportsSummaryColumnRanges(
  now: Date = new Date()
): readonly ReportsSummaryColumnRange[] {
  const lastYearNow = shiftCalendarYear(now, -1);
  return [
    { key: 'mtd', start: startOfMonth(now), end: now },
    { key: 'ytd', start: startOfYear(now), end: now },
    { key: 'lastYearMtd', start: startOfMonth(lastYearNow), end: lastYearNow },
    { key: 'lastYearYtd', start: startOfYear(lastYearNow), end: lastYearNow },
  ];
}
