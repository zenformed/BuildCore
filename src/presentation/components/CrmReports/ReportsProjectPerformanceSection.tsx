'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import {
  buildReportsProjectFilterCounts,
  filterReportsProjectRows,
} from '@/reports/calculations/reportsProjectPerformanceFilters';
import type { ReportsProjectFilterId, ReportsProjectRow } from '@/reports/types/crmReportsDashboard';
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

export function ReportsProjectPerformanceSection({
  rows,
}: ReportsProjectPerformanceSectionProps): ReactElement {
  const router = useRouter();
  const [filter, setFilter] = useState<ReportsProjectFilterId>('all');

  const filterCounts = useMemo(() => buildReportsProjectFilterCounts(rows), [rows]);

  const filteredRows = useMemo(
    () => filterReportsProjectRows(rows, filter),
    [rows, filter]
  );

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
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6}>{content.reports.table.emptyFiltered}</td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.projectId}>
                  <td>
                    <button
                      type="button"
                      className={styles.projectLink}
                      onClick={() => router.push(nav.routes.projectDetail(row.slug))}
                    >
                      {row.label}
                    </button>
                  </td>
                  <td>{formatCentsAsUsd(row.collectedCents)}</td>
                  <td>{formatCentsAsUsd(row.costsCents)}</td>
                  <td>{formatCentsAsUsd(row.profitCents)}</td>
                  <td>
                    {row.marginPercent != null ? `${row.marginPercent.toFixed(1)}%` : '—'}
                  </td>
                  <td>{row.statusLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
