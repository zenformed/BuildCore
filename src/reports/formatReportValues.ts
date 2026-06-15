import {
  formatBuildCoreDisplayDate,
  formatBuildCoreDisplayDateTime,
  formatBuildCoreDisplayDateTimeFromDate,
} from '@/platform/formatting/buildCoreDisplayDate';

export function formatReportCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatReportPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatReportDateTime(iso: string, date: Date = new Date(iso)): string {
  return formatBuildCoreDisplayDateTimeFromDate(date);
}

export function formatReportText(value: string | null | undefined, fallback = '—'): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function formatReportShortDate(iso: string | null | undefined): string {
  return formatBuildCoreDisplayDate(iso);
}

/** Parent rollup payment rows: parent name for own milestones, "- " prefix for child projects. */
export function formatProjectFinancialPaymentHierarchyLabel(
  projectLabel: string | null,
  parentProjectName: string
): string {
  if (projectLabel == null) {
    return formatReportText(parentProjectName);
  }
  return `- ${formatReportText(projectLabel)}`;
}

export function isProjectFinancialChildPaymentRow(projectLabel: string | null): boolean {
  return projectLabel != null;
}
