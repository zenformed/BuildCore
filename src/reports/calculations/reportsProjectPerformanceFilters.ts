import type { ReportsProjectFilterId, ReportsProjectRow } from '../types/crmReportsDashboard';

export function reportsProjectRowMatchesFilter(
  row: ReportsProjectRow,
  filter: ReportsProjectFilterId
): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return row.isActive;
  if (filter === 'completed') return row.isCompleted;
  if (filter === 'waiting_approval') return row.isWaitingApproval;
  return row.hasOverduePayments;
}

/** Flat filter for legacy callers; prefer hierarchical view model for reports UI. */
export function filterReportsProjectRows(
  rows: readonly ReportsProjectRow[],
  filter: ReportsProjectFilterId
): readonly ReportsProjectRow[] {
  if (filter === 'all') return rows;
  return rows.filter((row) => reportsProjectRowMatchesFilter(row, filter));
}

export function countReportsProjectRowsByFilter(
  rows: readonly ReportsProjectRow[],
  filter: ReportsProjectFilterId
): number {
  return filterReportsProjectRows(rows, filter).length;
}

export function buildReportsProjectFilterCounts(
  rows: readonly ReportsProjectRow[]
): Record<ReportsProjectFilterId, number> {
  const counts = {} as Record<ReportsProjectFilterId, number>;
  const filters: readonly ReportsProjectFilterId[] = [
    'all',
    'active',
    'completed',
    'waiting_approval',
    'overdue_payments',
  ];
  for (const id of filters) {
    counts[id] = countReportsProjectRowsByFilter(rows, id);
  }
  return counts;
}
