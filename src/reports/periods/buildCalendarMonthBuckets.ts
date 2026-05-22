export type CalendarMonthBucket = {
  readonly monthIndex: number;
  readonly label: string;
  readonly shortLabel: string;
  readonly start: Date;
  readonly end: Date;
};

function endOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
}

function startOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1, 0, 0, 0, 0);
}

/** Jan–Dec calendar months for a selected year (always 12 buckets). */
export function buildCalendarMonthBuckets(year: number): readonly CalendarMonthBucket[] {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
  const shortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const anchor = new Date(year, monthIndex, 15);
    return {
      monthIndex,
      label: formatter.format(anchor),
      shortLabel: shortFormatter.format(anchor),
      start: startOfMonth(year, monthIndex),
      end: endOfMonth(year, monthIndex),
    };
  });
}
