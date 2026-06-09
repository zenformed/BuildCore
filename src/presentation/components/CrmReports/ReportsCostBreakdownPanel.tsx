'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { formatReportPercent } from '@/reports/formatReportValues';
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
  const table = content.reports.costBreakdownTable;

  return (
    <aside className={`${projectStyles.card} ${styles.costBreakdownPanel}`} aria-label="Cost breakdown">
      <h2 className={projectStyles.cardTitle}>{content.reports.sections.costBreakdown}</h2>
      {rows.length === 0 ? (
        <p className={styles.chartEmpty}>{content.reports.costEmpty}</p>
      ) : (
        <div className={projectStyles.detailPanelTableCard}>
          <div className={styles.costTableWrap}>
            <div
              className={`${projectStyles.tableHeader} ${styles.costBreakdownGrid}`}
              role="row"
            >
              <span role="columnheader">{table.category}</span>
              <span role="columnheader">{table.cost}</span>
              <span role="columnheader">{table.costPercent}</span>
            </div>
            <ul className={styles.costList}>
              {rows.map((row) => (
                <li key={row.category}>
                  <div
                    className={`${projectStyles.tableRow} ${styles.costBreakdownGrid}`}
                    role="row"
                  >
                    <span>{reportBudgetCategoryLabel(row.category)}</span>
                    <span>{formatCentsAsUsd(row.costCents)}</span>
                    <span>{formatReportPercent(row.costPercent)}</span>
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
          </div>
        </div>
      )}
      {costsIncludeUndatedEntries ? (
        <p className={styles.note}>{content.reports.costsUndatedNote}</p>
      ) : null}
    </aside>
  );
}
