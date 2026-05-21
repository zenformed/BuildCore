'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { reportBudgetCategoryLabel } from '@/reports/labels/reportLabels';
import type { ReportsCostBreakdownRow } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

export type ReportsCostBreakdownPanelProps = {
  rows: readonly ReportsCostBreakdownRow[];
  costsIncludeUndatedEntries: boolean;
};

export function ReportsCostBreakdownPanel({
  rows,
  costsIncludeUndatedEntries,
}: ReportsCostBreakdownPanelProps): ReactElement {
  const maxCost = Math.max(...rows.map((row) => row.costCents), 1);

  return (
    <aside className={`${projectStyles.card} ${styles.costBreakdownPanel}`} aria-label="Cost breakdown">
      <h2 className={projectStyles.cardTitle}>{content.reports.sections.costBreakdown}</h2>
      {rows.length === 0 ? (
        <p className={styles.chartEmpty}>{content.reports.costEmpty}</p>
      ) : (
        <ul className={styles.costList}>
          {rows.map((row) => (
            <li key={row.category}>
              <div className={styles.costRow}>
                <span>{reportBudgetCategoryLabel(row.category)}</span>
                <span>{formatCentsAsUsd(row.costCents)}</span>
              </div>
              <div className={styles.costBarTrack}>
                <div
                  className={styles.costBarFill}
                  style={{ width: `${(row.costCents / maxCost) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {costsIncludeUndatedEntries ? (
        <p className={styles.note}>{content.reports.costsUndatedNote}</p>
      ) : null}
    </aside>
  );
}
