/** Normalize budget Cost Date between date inputs (YYYY-MM-DD) and stored ISO timestamps. */

export function dateInputFromCostIncurredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function costIncurredAtFromDateInput(yyyyMmDd: string): string {
  const trimmed = yyyyMmDd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Cost Date must be YYYY-MM-DD');
  }
  return `${trimmed}T12:00:00.000Z`;
}

export function formatCostDateDisplay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function defaultCostDateInput(): string {
  return dateInputFromCostIncurredAt(new Date().toISOString());
}
