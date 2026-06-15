const DEFAULT_FALLBACK = '—';

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

/** User-facing calendar date: MM/DD/YYYY */
export function formatBuildCoreDisplayDateFromDate(
  date: Date,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (!isValidDate(date)) return fallback;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/** User-facing calendar date from an ISO timestamp: MM/DD/YYYY */
export function formatBuildCoreDisplayDate(
  iso: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (iso == null || iso.trim() === '') return fallback;
  return formatBuildCoreDisplayDateFromDate(new Date(iso), fallback);
}

/** User-facing date and time: MM/DD/YYYY, h:mm AM/PM */
export function formatBuildCoreDisplayDateTimeFromDate(
  date: Date,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (!isValidDate(date)) return fallback;
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${formatBuildCoreDisplayDateFromDate(date)}, ${time}`;
}

/** User-facing date and time from an ISO timestamp: MM/DD/YYYY, h:mm AM/PM */
export function formatBuildCoreDisplayDateTime(
  iso: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (iso == null || iso.trim() === '') return fallback;
  return formatBuildCoreDisplayDateTimeFromDate(new Date(iso), fallback);
}
