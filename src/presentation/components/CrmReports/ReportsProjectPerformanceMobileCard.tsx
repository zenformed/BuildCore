'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import type { ReportsProjectRow } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

export type ReportsProjectPerformanceMobileCardProps = {
  readonly row: ReportsProjectRow;
  readonly variant: 'root' | 'child';
  readonly onNavigate: () => void;
};

function formatMarginPercent(marginPercent: number | null): string {
  return marginPercent != null ? `${marginPercent.toFixed(1)}%` : '—';
}

export function ReportsProjectPerformanceMobileCard({
  row,
  variant,
  onNavigate,
}: ReportsProjectPerformanceMobileCardProps): ReactElement {
  const tableCopy = content.reports.table;
  const isChild = variant === 'child';
  const cardClass = [
    projectStyles.card,
    projectStyles.workflowTaskMobileCard,
    styles.projectPerformanceMobileCard,
    isChild ? styles.projectPerformanceMobileCard_child : '',
  ]
    .filter(Boolean)
    .join(' ');
  const titleClass = [
    projectStyles.workflowTaskMobileCardTitleBtn,
    isChild ? styles.projectPerformanceMobileCardTitle_child : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass} aria-label={row.label}>
      <div className={projectStyles.workflowTaskMobileCardHeader}>
        <div className={projectStyles.workflowTaskMobileCardTitleWrap}>
          <button type="button" className={titleClass} onClick={onNavigate}>
            {row.label}
          </button>
        </div>
        <span className={styles.projectPerformanceMobileStatus}>{row.statusLabel}</span>
      </div>
      <div className={projectStyles.workflowTaskMobileCardGrid3}>
        <div className={projectStyles.workflowTaskMobileCardCell}>
          <span className={projectStyles.projectInfoMobileLabel}>{tableCopy.collected}</span>
          <span className={projectStyles.workflowTaskMobileCardValue}>
            {formatCentsAsUsd(row.collectedCents)}
          </span>
        </div>
        <div
          className={`${projectStyles.workflowTaskMobileCardCell} ${projectStyles.workflowTaskMobileCardCell_center}`}
        >
          <span className={projectStyles.projectInfoMobileLabel}>{tableCopy.costs}</span>
          <span className={projectStyles.workflowTaskMobileCardValue}>
            {formatCentsAsUsd(row.costsCents)}
          </span>
        </div>
        <div
          className={`${projectStyles.workflowTaskMobileCardCell} ${projectStyles.workflowTaskMobileCardCell_right}`}
        >
          <span className={projectStyles.projectInfoMobileLabel}>{tableCopy.profit}</span>
          <span className={projectStyles.workflowTaskMobileCardValue}>
            {formatCentsAsUsd(row.profitCents)}
          </span>
        </div>
      </div>
      <div className={styles.projectPerformanceMobileMarginRow}>
        <span className={projectStyles.projectInfoMobileLabel}>{tableCopy.margin}</span>
        <span className={styles.projectPerformanceMobileMarginValue}>
          {formatMarginPercent(row.marginPercent)}
        </span>
      </div>
    </article>
  );
}
