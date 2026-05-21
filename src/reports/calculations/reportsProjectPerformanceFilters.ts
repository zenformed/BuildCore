import type { ReportsProjectFilterId, ReportsProjectRow } from '../types/crmReportsDashboard';

const PROJECT_FILTER_IDS: readonly ReportsProjectFilterId[] = [
  'all',
  'active',
  'completed',
  'waiting_approval',
  'overdue_payments',
];

export function filterReportsProjectRows(
  rows: readonly ReportsProjectRow[],
  filter: ReportsProjectFilterId
): readonly ReportsProjectRow[] {
  if (filter === 'all') return rows;
  if (filter === 'active') return rows.filter((row) => row.isActive);
  if (filter === 'completed') return rows.filter((row) => row.isCompleted);
  if (filter === 'waiting_approval') return rows.filter((row) => row.isWaitingApproval);
  return rows.filter((row) => row.hasOverduePayments);
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
  for (const id of PROJECT_FILTER_IDS) {
    counts[id] = countReportsProjectRowsByFilter(rows, id);
  }
  return counts;
}
