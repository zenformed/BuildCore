'use client';

import type { ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useCrmReportsDashboard } from '@/presentation/features/crmReports/useCrmReportsDashboard';
import { reportBudgetCategoryLabel } from '@/reports/labels/reportLabels';
import type { ReportChartTabId, ReportPeriodId } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import { ReportsKpiCard } from './ReportsKpiCard';
import { ReportsLineChart } from './ReportsLineChart';
import styles from './CrmReports.module.css';

const PERIOD_IDS: readonly ReportPeriodId[] = ['mtd', 'qtd', 'ytd', 'all'];
const CHART_TAB_IDS: readonly ReportChartTabId[] = ['revenue', 'profit', 'costs', 'receivables'];

export function CrmReportsDashboard(): ReactElement {
  const router = useRouter();
  const { dashboard, isLoading, error, period, setPeriod, chartTab, setChartTab } =
    useCrmReportsDashboard();

  if (isLoading) {
    return <p className={styles.loading}>{content.reports.loading}</p>;
  }

  if (error || dashboard == null) {
    return <p className={styles.error}>{error ?? content.reports.loadError}</p>;
  }

  const maxCost = Math.max(...dashboard.costBreakdown.map((r) => r.costCents), 1);
  const detail = content.projectDetail;

  return (
    <div className={projectStyles.pageShell} data-crm-reports-page>
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
            footRightValue={formatCentsAsUsd(dashboard.netProfit.totalCostsCents)}
            footRightLabel={content.reports.kpi.foot.costs}
          />
        </section>

        <section className={styles.middleRow}>
          <div className={`${projectStyles.card} ${styles.chartPanel}`}>
            <div className={styles.chartToolbar}>
              <div className={projectStyles.pillRow} role="tablist" aria-label="Chart metric">
                {CHART_TAB_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={chartTab === id}
                    className={
                      chartTab === id
                        ? `${projectStyles.stageChip} ${projectStyles.stageChip_current}`
                        : projectStyles.stageChip
                    }
                    onClick={() => setChartTab(id)}
                  >
                    {content.reports.chartTabs[id]}
                  </button>
                ))}
              </div>
              <p className={styles.chartPeriodLabel} aria-live="polite">
                {content.reports.periods[period]}
              </p>
            </div>
            <ReportsLineChart series={dashboard.chart} formatValue={formatCentsAsUsd} />
          </div>
          <aside
            className={`${projectStyles.card} ${styles.metricsPanel}`}
            aria-label="Summary metrics"
          >
            <div className={styles.metricsGrid}>
              {dashboard.sideMetrics.map((metric) => (
                <div key={metric.label} className={styles.metricCell}>
                  <span className={styles.metricCellValue}>{metric.value}</span>
                  <span className={styles.metricCellLabel}>{metric.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className={styles.lowerRow}>
          <div className={`${projectStyles.card} ${styles.lowerPanel}`}>
            <h2 className={projectStyles.cardTitle}>{content.reports.sections.projectPerformance}</h2>
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
                  {dashboard.projectRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>{content.reports.table.empty}</td>
                    </tr>
                  ) : (
                    dashboard.projectRows.map((row) => (
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
          </div>
          <div className={`${projectStyles.card} ${styles.lowerPanel}`}>
            <h2 className={projectStyles.cardTitle}>{content.reports.sections.costBreakdown}</h2>
            {dashboard.costBreakdown.length === 0 ? (
              <p className={styles.chartEmpty}>{content.reports.costEmpty}</p>
            ) : (
              <ul className={styles.costList}>
                {dashboard.costBreakdown.map((row) => (
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
            {dashboard.costsIncludeUndatedEntries ? (
              <p className={styles.note}>{content.reports.costsUndatedNote}</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
