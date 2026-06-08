'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useCrmReportsDashboard } from '@/presentation/features/crmReports/useCrmReportsDashboard';
import { useCrmReportsPdfExport } from '@/presentation/features/crmReports/useCrmReportsPdfExport';
import { ReportsPdfExportControls } from './ReportsPdfExportControls';
import type { ReportPeriodId } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { ReportsFolderTabs } from './ReportsFolderTabs';
import { ReportsKpiCard } from './ReportsKpiCard';
import styles from './CrmReports.module.css';

const PERIOD_IDS: readonly ReportPeriodId[] = ['mtd', 'qtd', 'ytd', 'all'];

export function CrmReportsDashboard(): ReactElement {
  const { dashboard, projects, isLoading, error, period, setPeriod, chartTab, setChartTab } =
    useCrmReportsDashboard();
  const pdfExport = useCrmReportsPdfExport(projects, period);

  if (isLoading) {
    return <p className={styles.loading}>{content.reports.loading}</p>;
  }

  if (error || dashboard == null) {
    return <p className={styles.error}>{error ?? content.reports.loadError}</p>;
  }

  const detail = content.projectDetail;

  return (
    <div className={`${styles.reportsPageShell}`} data-crm-reports-page>
      <header className={projectStyles.detailHeader}>
        <div className={projectStyles.detailHeaderMain}>
          <div className={projectStyles.titleBlock}>
            <nav className={projectStyles.breadcrumb} aria-label="Breadcrumb">
              <span className={projectStyles.breadcrumbMuted}>{detail.breadcrumbCrm}</span>
              <span className={projectStyles.breadcrumbSep} aria-hidden>
                /
              </span>
              <span className={projectStyles.breadcrumbCurrent}>{content.reports.title}</span>
            </nav>
            <h1 className={projectStyles.title}>{content.reports.title}</h1>
          </div>
        </div>
        <div className={projectStyles.detailHeaderActions}>
          <div className={projectStyles.pillRow} role="tablist" aria-label="Report period">
            {PERIOD_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={period === id}
                className={
                  period === id
                    ? `${projectStyles.stageChip} ${projectStyles.stageChip_current}`
                    : projectStyles.stageChip
                }
                onClick={() => setPeriod(id)}
              >
                {content.reports.periods[id]}
              </button>
            ))}
            <ReportsPdfExportControls exportState={pdfExport} />
          </div>
        </div>
      </header>

      <div className={styles.dashboardBody}>
        <section className={styles.kpiRow} aria-label="Key metrics">
          <ReportsKpiCard
            icon="collected"
            mainDisplay={formatCentsAsUsd(dashboard.collected.mainCents)}
            metricLabel={content.reports.kpi.collected}
            comparison={dashboard.collected.comparison}
            footLeftValue={String(dashboard.collected.paymentCount)}
            footLeftLabel={content.reports.kpi.foot.payments}
            footRightValue={formatCentsAsUsd(dashboard.collected.avgPaymentCents)}
            footRightLabel={content.reports.kpi.foot.avgPayment}
          />
          <ReportsKpiCard
            icon="receivables"
            mainDisplay={formatCentsAsUsd(dashboard.receivables.mainCents)}
            metricLabel={content.reports.kpi.receivables}
            comparison={dashboard.receivables.comparison}
            footLeftValue={String(dashboard.receivables.unpaidCount)}
            footLeftLabel={content.reports.kpi.foot.unpaid}
            footRightValue={String(dashboard.receivables.overdueCount)}
            footRightLabel={content.reports.kpi.foot.overdue}
          />
          <ReportsKpiCard
            icon="netProfit"
            mainDisplay={formatCentsAsUsd(dashboard.netProfit.mainCents)}
            metricLabel={content.reports.kpi.netProfit}
            comparison={dashboard.netProfit.comparison}
            footLeftValue={
              dashboard.netProfit.marginPercent != null
                ? `${dashboard.netProfit.marginPercent.toFixed(1)}%`
                : '—'
            }
            footLeftLabel={content.reports.kpi.foot.margin}
            footRightValue={
              dashboard.netProfit.avgDaysToPay != null
                ? dashboard.netProfit.avgDaysToPay.toFixed(1)
                : '—'
            }
            footRightLabel={content.reports.kpi.foot.avgDaysToPay}
          />
        </section>

        <ReportsFolderTabs
          dashboard={dashboard}
          period={period}
          chartTab={chartTab}
          onChartTabChange={setChartTab}
        />
      </div>
    </div>
  );
}
