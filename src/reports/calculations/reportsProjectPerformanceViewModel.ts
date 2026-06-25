import type { ReportsProjectFilterId, ReportsProjectRow } from '../types/crmReportsDashboard';
import { reportsProjectRowMatchesFilter } from './reportsProjectPerformanceFilters';

function sortReportsProjectRowsByCollected(
  rows: readonly ReportsProjectRow[]
): ReportsProjectRow[] {
  return [...rows].sort((a, b) => b.collectedCents - a.collectedCents);
}

export function partitionReportsProjectRows(rows: readonly ReportsProjectRow[]): {
  roots: ReportsProjectRow[];
  childrenByParentId: Map<string, ReportsProjectRow[]>;
} {
  const roots: ReportsProjectRow[] = [];
  const childrenByParentId = new Map<string, ReportsProjectRow[]>();

  for (const row of rows) {
    if (row.parentProjectId == null) {
      roots.push(row);
      continue;
    }
    const siblings = childrenByParentId.get(row.parentProjectId) ?? [];
    siblings.push(row);
    childrenByParentId.set(row.parentProjectId, siblings);
  }

  for (const [parentId, children] of childrenByParentId) {
    childrenByParentId.set(parentId, sortReportsProjectRowsByCollected(children));
  }

  return {
    roots: sortReportsProjectRowsByCollected(roots),
    childrenByParentId,
  };
}

export function filterReportsProjectPerformanceView(
  rows: readonly ReportsProjectRow[],
  filter: ReportsProjectFilterId
): {
  rootRows: ReportsProjectRow[];
  allChildrenByParentId: Map<string, ReportsProjectRow[]>;
  visibleChildrenByParentId: Map<string, ReportsProjectRow[]>;
} {
  const { roots, childrenByParentId } = partitionReportsProjectRows(rows);
  const visibleChildrenByParentId = new Map<string, ReportsProjectRow[]>();

  for (const [parentId, children] of childrenByParentId) {
    const matchingChildren = children.filter((child) =>
      reportsProjectRowMatchesFilter(child, filter)
    );
    if (matchingChildren.length > 0) {
      visibleChildrenByParentId.set(parentId, sortReportsProjectRowsByCollected(matchingChildren));
    }
  }

  const rootRows = sortReportsProjectRowsByCollected(
    roots.filter((root) => reportsProjectRowMatchesFilter(root, filter))
  );

  return {
    rootRows,
    allChildrenByParentId: childrenByParentId,
    visibleChildrenByParentId,
  };
}

export function buildReportsProjectPerformanceFilterCounts(
  rows: readonly ReportsProjectRow[]
): Record<ReportsProjectFilterId, number> {
  const { roots, childrenByParentId } = partitionReportsProjectRows(rows);
  const counts: Record<ReportsProjectFilterId, number> = {
    all: roots.length,
    active: 0,
    completed: 0,
    waiting_approval: 0,
    overdue_payments: 0,
  };

  for (const filter of [
    'active',
    'completed',
    'waiting_approval',
    'overdue_payments',
  ] as const) {
    counts[filter] = roots.filter((root) => reportsProjectRowMatchesFilter(root, filter)).length;
  }

  return counts;
}
