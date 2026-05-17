export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatShortDate(iso: string | null): string {
  if (iso == null) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function formatDocumentKind(kind: string): string {
  return kind
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatWorkflowStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function formatMilestoneStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Abbreviated stage label for compact pipeline chips. */
export function shortStageLabel(label: string): string {
  if (label.length <= 14) return label;
  const first = label.split(' ')[0];
  return first ?? label;
}
