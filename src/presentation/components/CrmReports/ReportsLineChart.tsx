'use client';

import { useMemo, type ReactElement } from 'react';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ReportsTimeSeries } from '@/reports/types/crmReportsDashboard';
import { ensureChartJsRegistered } from '@/presentation/charts/registerChartJs';
import { useChartTheme } from '@/presentation/charts/useChartTheme';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import styles from './CrmReports.module.css';

ensureChartJsRegistered();

type ReportsLineChartProps = {
  series: ReportsTimeSeries;
  formatValue: (cents: number) => string;
};

export function ReportsLineChart({ series, formatValue }: ReportsLineChartProps): ReactElement {
  const theme = useChartTheme();
  const isMobileLayout = useDashboardMobileLayout();
  const { labels, tooltipLabels, valuesCents } = series;

  const chartData = useMemo(
    () => ({
      labels: [...labels],
      datasets: [
        {
          data: [...valuesCents],
          borderColor: theme.line,
          backgroundColor: theme.line,
          pointBackgroundColor: theme.line,
          pointBorderColor: theme.pointBorder,
          pointHoverBackgroundColor: theme.pointHover,
          pointHoverBorderColor: theme.pointBorder,
          pointBorderWidth: isMobileLayout ? 0 : 1.5,
          pointRadius: isMobileLayout ? 0 : 4,
          pointHoverRadius: isMobileLayout ? 0 : 5,
          pointHitRadius: isMobileLayout ? 14 : 4,
          borderWidth: 2,
          tension: 0,
          fill: false,
        },
      ],
    }),
    [isMobileLayout, labels, valuesCents, theme]
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.grid,
          borderWidth: 1,
          callbacks: {
            title: (items) => {
              const index = items[0]?.dataIndex ?? 0;
              return tooltipLabels[index] ?? labels[index] ?? '';
            },
            label: (item) => formatValue(Number(item.parsed.y)),
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: theme.textMuted,
            maxTicksLimit: isMobileLayout ? 5 : 12,
            autoSkip: true,
            autoSkipPadding: isMobileLayout ? 12 : 4,
            maxRotation: 0,
            font: { size: isMobileLayout ? 10 : 11 },
          },
          grid: { display: false },
          border: { color: theme.border },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: theme.textMuted,
            count: 5,
            callback: (value) => formatValue(Number(value)),
            font: { size: 10 },
          },
          grid: { color: theme.grid },
          border: { display: false },
        },
      },
    }),
    [isMobileLayout, theme, tooltipLabels, labels, formatValue]
  );

  if (labels.length === 0) {
    return (
      <div className={styles.chartWrap}>
        <p className={styles.chartEmpty}>No data for this period.</p>
      </div>
    );
  }

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartInner}>
        <Line data={chartData} options={options} className={styles.chartCanvas} />
      </div>
    </div>
  );
}
