import type { CrmDocumentMetadata } from '@/domain/crm';

/** Local calendar day key YYYY-MM-DD. */
export function documentGalleryDayKey(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map((part) => Number(part));
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * Friendly gallery headings: Today, Yesterday, Sun, Jul 19, or Jun 24, 2026.
 */
export function formatDocumentGalleryDayHeading(dayKey: string, now = new Date()): string {
  const day = startOfLocalDay(parseDayKey(dayKey));
  const today = startOfLocalDay(now);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const sameYear = day.getFullYear() === today.getFullYear();
  if (sameYear) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(day);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(day);
}

export type DocumentGalleryDayGroup = {
  readonly dayKey: string;
  readonly heading: string;
  readonly documents: readonly CrmDocumentMetadata[];
};

/** Newest-first documents grouped by calendar upload day. */
export function groupDocumentsByGalleryDay(
  documents: readonly CrmDocumentMetadata[],
  now = new Date()
): DocumentGalleryDayGroup[] {
  const sorted = [...documents].sort((a, b) => {
    const aTime = new Date(a.uploadedAt).getTime();
    const bTime = new Date(b.uploadedAt).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  });

  const byDay = new Map<string, CrmDocumentMetadata[]>();
  for (const doc of sorted) {
    const key = documentGalleryDayKey(doc.uploadedAt, now);
    const list = byDay.get(key);
    if (list) list.push(doc);
    else byDay.set(key, [doc]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dayKey, docs]) => ({
      dayKey,
      heading: formatDocumentGalleryDayHeading(dayKey, now),
      documents: docs,
    }));
}
