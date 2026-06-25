'use client';

import { useMemo, type ReactElement } from 'react';
import type { ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ReportsRevenueCostChart } from '@/reports/types/crmReportsDashboard';
import { ensureChartJsRegistered } from '@/presentation/charts/registerChartJs';
import { useChartTheme } from '@/presentation/charts/useChartTheme';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import styles from './CrmReports.module.css';

ensureChartJsRegistered();

const REVENUE_COLOR = '#22c55e';
const COSTS_COLOR = '#f97316';

type ReportsBarChartProps = {
  series: ReportsRevenueCostChart;
  formatValue: (cents: number) => string;
};

export function ReportsBarChart({ series, formatValue }: ReportsBarChartProps): ReactElement {
  const theme = useChartTheme();
  const isMobileLayout = useDashboardMobileLayout();
  const { labels, tooltipLabels, revenueCents, costsCents } = series;
  const chartLabels = content.reports.charts;

  const chartData = useMemo(
    () => ({
      labels: [...labels],
      datasets: [
        {
          label: chartLabels.revenueCollected,
          data: [...revenueCents],
          backgroundColor: REVENUE_COLOR,
          borderColor: REVENUE_COLOR,
          borderWidth: 0,
          borderRadius: 3,
          maxBarThickness: isMobileLayout ? 14 : 22,
        },
        {
          label: chartLabels.costs,
          data: [...costsCents],
          backgroundColor: COSTS_COLOR,
          borderColor: COSTS_COLOR,
          borderWidth: 0,
          borderRadius: 3,
          maxBarThickness: isMobileLayout ? 14 : 22,
        },
      ],
    }),
    [chartLabels.costs, chartLabels.revenueCollected, costsCents, isMobileLayout, labels, revenueCents]
  );

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: theme.textMuted,
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
            font: { size: 11 },
            usePointStyle: true,
            pointStyle: 'rectRounded',
          },
        },
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
            label: (item) => {
              const label = item.dataset.label ?? '';
              return `${label}: ${formatValue(Number(item.parsed.y))}`;
            },
            afterBody: (items) => {
              const index = items[0]?.dataIndex ?? 0;
              const revenue = revenueCents[index] ?? 0;
              const costs = costsCents[index] ?? 0;
              return `${chartLabels.profit}: ${formatValue(revenue - costs)}`;
            },
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
    [
      chartLabels.profit,
      costsCents,
      formatValue,
      isMobileLayout,
      labels,
      revenueCents,
      theme,
      tooltipLabels,
    ]
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
        <Bar data={chartData} options={options} className={styles.chartCanvas} />
      </div>
    </div>
  );
}
