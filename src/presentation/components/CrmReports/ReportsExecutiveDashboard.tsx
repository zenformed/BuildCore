'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import type { CrmReportsDashboardData, ReportPeriodId } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { ReportsBarChart } from './ReportsBarChart';
import { ReportsBudgetHalfDonutChart } from './ReportsBudgetHalfDonutChart';
import { ReportsProjectPerformanceSection } from './ReportsProjectPerformanceSection';
import { ReportsRecentActivityPanel } from './ReportsRecentActivityPanel';
import styles from './CrmReports.module.css';

export type ReportsExecutiveDashboardProps = {
  readonly dashboard: CrmReportsDashboardData;
  readonly period: ReportPeriodId;
};

export function ReportsExecutiveDashboard({
  dashboard,
  period,
}: ReportsExecutiveDashboardProps): ReactElement {
  return (
    <div className={styles.executiveDashboard}>
      <div className={styles.executiveRowMiddle}>
        <section className={`${projectStyles.card} ${styles.chartPanel}`}>
          <div className={styles.chartToolbar}>
            <h2 className={projectStyles.cardTitle}>{content.reports.sections.dailyRevenueCosts}</h2>
            <p className={styles.chartPeriodLabel} aria-live="polite">
              {content.reports.periods[period]}
            </p>
          </div>
          <ReportsBarChart series={dashboard.revenueCostChart} formatValue={formatCentsAsUsd} />
        </section>
        <ReportsBudgetHalfDonutChart
          rows={dashboard.costBreakdown}
          costsIncludeUndatedEntries={dashboard.costsIncludeUndatedEntries}
          period={period}
        />
      </div>
      <div className={styles.executiveRowBottom}>
        <ReportsProjectPerformanceSection rows={dashboard.projectRows} />
        <ReportsRecentActivityPanel items={dashboard.recentActivity} />
      </div>
    </div>
  );
}
