'use client';

import type { ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { ReportsFinancialActivityItem } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

export type ReportsRecentActivityPanelProps = {
  items: readonly ReportsFinancialActivityItem[];
};

export function ReportsRecentActivityPanel({ items }: ReportsRecentActivityPanelProps): ReactElement {
  const router = useRouter();

  return (
    <aside
      className={`${projectStyles.card} ${styles.activityPanel}`}
      aria-label={content.reports.sections.recentActivity}
    >
      <h2 className={projectStyles.cardTitle}>{content.reports.sections.recentActivity}</h2>
      {items.length === 0 ? (
        <p className={styles.chartEmpty}>{content.reports.activity.empty}</p>
      ) : (
        <ul className={styles.activityFeed}>
          {items.map((item) => (
            <li key={item.id} className={styles.activityItem}>
              <time className={styles.activityTime} dateTime={item.occurredAt}>
                {item.displayAt}
              </time>
              <button
                type="button"
                className={styles.activitySummary}
                onClick={() => router.push(nav.routes.projectDetail(item.projectSlug))}
              >
                {item.summary}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
