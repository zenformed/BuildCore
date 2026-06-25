'use client';

import { useMemo, type ReactElement } from 'react';
import type { ChartOptions } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ensureChartJsRegistered } from '@/presentation/charts/registerChartJs';
import { useChartTheme } from '@/presentation/charts/useChartTheme';
import {
  buildBudgetCategoryPieSlices,
  budgetCategoryColorByCategory,
} from '@/presentation/features/crmProjectDetail/budgetCategoryPieModel';
import { formatReportPercent } from '@/reports/formatReportValues';
import { reportBudgetCategoryLabel } from '@/reports/labels/reportLabels';
import type { ReportsCostBreakdownRow, ReportPeriodId } from '@/reports/types/crmReportsDashboard';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

ensureChartJsRegistered();

type ReportsBudgetHalfDonutChartProps = {
  rows: readonly ReportsCostBreakdownRow[];
  costsIncludeUndatedEntries: boolean;
  period: ReportPeriodId;
};

export function ReportsBudgetHalfDonutChart({
  rows,
  costsIncludeUndatedEntries,
  period,
}: ReportsBudgetHalfDonutChartProps): ReactElement {
  const theme = useChartTheme();
  const categoryCosts = useMemo(
    () => rows.map((row) => ({ category: row.category, costCents: row.costCents })),
    [rows]
  );
  const { total, slices } = buildBudgetCategoryPieSlices(categoryCosts);
  const colorByCategory = useMemo(() => budgetCategoryColorByCategory(slices), [slices]);

  const chartData = useMemo(
    () => ({
      labels: slices.map((slice) => reportBudgetCategoryLabel(slice.row.category)),
      datasets: [
        {
          data: slices.map((slice) => slice.row.costCents),
          backgroundColor: slices.map((slice) => slice.color),
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 4,
          borderAlign: 'inner' as const,
          spacing: 3,
          hoverOffset: 2,
        },
      ],
    }),
    [slices]
  );

  const options = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      rotation: -90,
      circumference: 180,
      cutout: '62%',
      layout: { padding: { top: 4, bottom: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.grid,
          borderWidth: 1,
          callbacks: {
            label: (item) => {
              const cents = Number(item.parsed);
              const percent = total > 0 ? ((cents / total) * 100).toFixed(1) : '0';
              return `${item.label}: ${formatCentsAsUsd(cents)} (${percent}%)`;
            },
          },
        },
      },
    }),
    [theme, total]
  );

  return (
    <aside
      className={`${projectStyles.card} ${styles.budgetDonutPanel}`}
      aria-label={content.reports.sections.costBreakdown}
    >
      <div className={styles.chartToolbar}>
        <h2 className={projectStyles.cardTitle}>{content.reports.sections.costBreakdown}</h2>
        <p className={styles.chartPeriodLabel} aria-live="polite">
          {content.reports.periods[period]}
        </p>
      </div>
      {total <= 0 ? (
        <p className={styles.chartEmpty}>{content.reports.costEmpty}</p>
      ) : (
        <>
          <div className={styles.budgetDonutBody}>
            <div className={styles.budgetDonutChartWrap}>
              <Doughnut data={chartData} options={options} className={styles.chartCanvas} />
              <div className={styles.budgetDonutCenter} aria-hidden>
                <span className={styles.budgetDonutCenterLabel}>{content.reports.charts.totalCosts}</span>
                <span className={styles.budgetDonutCenterValue}>{formatCentsAsUsd(total)}</span>
              </div>
            </div>
            <ul className={styles.budgetDonutLegend} aria-label="Cost breakdown by category">
              {rows.map((row) => {
                const segmentColor = colorByCategory.get(row.category) ?? '#64748b';
                return (
                  <li key={row.category} className={styles.budgetDonutLegendRow}>
                  <span className={styles.budgetDonutLegendName}>
                    <span
                      className={styles.budgetDonutLegendSwatch}
                      style={{ backgroundColor: segmentColor }}
                      aria-hidden
                    />
                    <span className={styles.budgetDonutLegendNameText}>
                      {reportBudgetCategoryLabel(row.category)}
                    </span>
                  </span>
                  <span className={styles.budgetDonutLegendAmount}>
                    {formatCentsAsUsd(row.costCents)}
                  </span>
                  <span className={styles.budgetDonutLegendPercent}>
                    {formatReportPercent(row.costPercent)}
                  </span>
                </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
      {costsIncludeUndatedEntries ? (
        <p className={styles.costsNote}>{content.reports.costsUndatedNote}</p>
      ) : null}
    </aside>
  );
}
