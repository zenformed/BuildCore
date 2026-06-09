'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import {
  buildReportsProjectPerformanceFilterCounts,
  filterReportsProjectPerformanceView,
} from '@/reports/calculations/reportsProjectPerformanceViewModel';
import type { ReportsProjectFilterId, ReportsProjectRow } from '@/reports/types/crmReportsDashboard';
import tableStyles from '../CrmProjects/CrmProjects.module.css';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

const PROJECT_FILTER_IDS: readonly ReportsProjectFilterId[] = [
  'all',
  'active',
  'completed',
  'waiting_approval',
  'overdue_payments',
];

export type ReportsProjectPerformanceSectionProps = {
  rows: readonly ReportsProjectRow[];
};

type ProjectPerformanceRowProps = {
  row: ReportsProjectRow;
  variant: 'root' | 'child';
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onNavigate: () => void;
};

function ProjectPerformanceRow({
  row,
  variant,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  onNavigate,
}: ProjectPerformanceRowProps): ReactElement {
  const tableCopy = content.crm.table;
  const isChild = variant === 'child';
  const nameCellClass = isChild
    ? `${styles.projectPerformanceNameCell} ${styles.projectPerformanceNameCell_child}`
    : styles.projectPerformanceNameCell;

  return (
    <tr className={isChild ? styles.projectPerformanceRow_child : undefined}>
      <td>
        <div className={nameCellClass}>
          <button type="button" className={styles.projectPerformanceLink} onClick={onNavigate}>
            {row.label}
          </button>
          {!isChild && hasChildren ? (
            <button
              type="button"
              className={tableStyles.expandToggle}
              aria-expanded={isExpanded}
              aria-label={
                isExpanded ? tableCopy.collapseSubprojects : tableCopy.expandSubprojects
              }
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand?.();
              }}
            >
              <span className={tableStyles.expandChevronWrap} aria-hidden>
                <span
                  className={
                    isExpanded ? tableStyles.expandChevron_expanded : tableStyles.expandChevron
                  }
                />
              </span>
            </button>
          ) : null}
        </div>
      </td>
      <td>{formatCentsAsUsd(row.collectedCents)}</td>
      <td>{formatCentsAsUsd(row.costsCents)}</td>
      <td>{formatCentsAsUsd(row.profitCents)}</td>
      <td>{row.marginPercent != null ? `${row.marginPercent.toFixed(1)}%` : '—'}</td>
      <td>{row.statusLabel}</td>
    </tr>
  );
}

export function ReportsProjectPerformanceSection({
  rows,
}: ReportsProjectPerformanceSectionProps): ReactElement {
  const router = useRouter();
  const [filter, setFilter] = useState<ReportsProjectFilterId>('all');
  const [expandedParentIds, setExpandedParentIds] = useState<ReadonlySet<string>>(() => new Set());

  const filterCounts = useMemo(
    () => buildReportsProjectPerformanceFilterCounts(rows),
    [rows]
  );

  const { rootRows, allChildrenByParentId, visibleChildrenByParentId } = useMemo(
    () => filterReportsProjectPerformanceView(rows, filter),
    [rows, filter]
  );

  const toggleExpanded = (parentId: string): void => {
    setExpandedParentIds((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  return (
    <section className={`${projectStyles.card} ${styles.lowerPanel}`}>
      <div className={styles.lowerPanelHeader}>
        <h2 className={projectStyles.cardTitle}>{content.reports.sections.projectPerformance}</h2>
        <div className={projectStyles.pillRow} role="group" aria-label="Project filters">
          {PROJECT_FILTER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={
                filter === id
                  ? `${projectStyles.stageChip} ${projectStyles.stageChip_current}`
                  : projectStyles.stageChip
              }
              aria-pressed={filter === id}
              aria-label={`${content.reports.projectFilters[id]} (${filterCounts[id]})`}
              onClick={() => setFilter(id)}
            >
              <span className={projectStyles.stageChipLabel}>{content.reports.projectFilters[id]}</span>
              <span className={projectStyles.stageChipNum}>{filterCounts[id]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={projectStyles.detailPanelTableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{content.reports.table.project}</th>
                <th>{content.reports.table.collected}</th>
                <th>{content.reports.table.costs}</th>
                <th>{content.reports.table.profit}</th>
                <th>{content.reports.table.margin}</th>
                <th>{content.reports.table.status}</th>
              </tr>
            </thead>
            <tbody>
              {rootRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>{content.reports.table.emptyFiltered}</td>
                </tr>
              ) : (
                rootRows.flatMap((root) => {
                  const childCount = allChildrenByParentId.get(root.projectId)?.length ?? 0;
                  const hasChildren = childCount > 0;
                  const isExpanded = expandedParentIds.has(root.projectId);
                  const visibleChildren = visibleChildrenByParentId.get(root.projectId) ?? [];

                  const rootRow = (
                    <ProjectPerformanceRow
                      key={root.projectId}
                      row={root}
                      variant="root"
                      hasChildren={hasChildren}
                      isExpanded={isExpanded}
                      onToggleExpand={hasChildren ? () => toggleExpanded(root.projectId) : undefined}
                      onNavigate={() => router.push(nav.routes.projectDetail(root.slug))}
                    />
                  );

                  if (!isExpanded || visibleChildren.length === 0) {
                    return [rootRow];
                  }

                  const childRows = visibleChildren.map((child) => (
                    <ProjectPerformanceRow
                      key={child.projectId}
                      row={child}
                      variant="child"
                      onNavigate={() =>
                        router.push(nav.routes.projectSubDetail(root.slug, child.slug))
                      }
                    />
                  ));

                  return [rootRow, ...childRows];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
