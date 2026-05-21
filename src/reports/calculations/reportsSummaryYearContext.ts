export type ReportsSummaryYearContext = {
  readonly currentYear: number;
  readonly priorYear: number;
  readonly yearContextLine: string;
};

export function buildReportsSummaryYearContext(now: Date = new Date()): ReportsSummaryYearContext {
  const currentYear = now.getFullYear();
  const priorYear = currentYear - 1;
  return {
    currentYear,
    priorYear,
    yearContextLine: `Reporting year ${currentYear}. ${priorYear} MTD and ${priorYear} YTD use the same calendar periods one year earlier.`,
  };
}

export function buildReportsSummaryColumnHeaders(
  priorYear: number
): readonly { amount: string; percent: string }[] {
  return [
    { amount: 'MTD', percent: 'MTD %' },
    { amount: 'YTD', percent: 'YTD %' },
    { amount: `${priorYear} MTD`, percent: `${priorYear} MTD %` },
    { amount: `${priorYear} YTD`, percent: `${priorYear} YTD %` },
  ];
}
