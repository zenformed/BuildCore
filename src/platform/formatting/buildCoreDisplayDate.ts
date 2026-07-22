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

/**
 * Photo viewer timestamp: MM/DD/YYYY HH:MM AM/PM (zero-padded hour, no comma).
 * Example: 05/02/2026 08:35 AM
 */
export function formatBuildCoreDisplayDateTimePhotoMeta(
  iso: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (iso == null || iso.trim() === '') return fallback;
  const date = new Date(iso);
  if (!isValidDate(date)) return fallback;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hour = String(hours).padStart(2, '0');
  return `${month}/${day}/${year} ${hour}:${minutes} ${meridiem}`;
}
