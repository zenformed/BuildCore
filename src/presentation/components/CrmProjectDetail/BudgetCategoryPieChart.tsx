'use client';

import { useMemo, type ReactElement } from 'react';
import type { ChartOptions } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import type { CrmBudgetCategoryCost } from '@/domain/crm';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import { buildBudgetCategoryPieSlices } from '@/presentation/features/crmProjectDetail/budgetCategoryPieModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { ensureChartJsRegistered } from '@/presentation/charts/registerChartJs';
import { useChartTheme } from '@/presentation/charts/useChartTheme';
import styles from './ProjectDetail.module.css';

ensureChartJsRegistered();

type BudgetCategoryPieChartProps = {
  categoryCosts: readonly CrmBudgetCategoryCost[];
};

export function BudgetCategoryPieChart({ categoryCosts }: BudgetCategoryPieChartProps): ReactElement {
  const theme = useChartTheme();
  const { total, slices } = buildBudgetCategoryPieSlices(categoryCosts);

  const chartData = useMemo(
    () => ({
      labels: slices.map((slice) => formatBudgetCategory(slice.row.category)),
      datasets: [
        {
          data: slices.map((slice) => slice.row.costCents),
          backgroundColor: slices.map((slice) => slice.color),
          borderColor: theme.pointBorder,
          borderWidth: 1,
        },
      ],
    }),
    [slices, theme.pointBorder]
  );

  const options = useMemo<ChartOptions<'pie'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
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

  if (total <= 0) {
    return <p className={styles.budgetPieEmpty}>No cost data yet.</p>;
  }

  return (
    <div className={styles.budgetPieChartSplitWrap}>
      <div className={styles.budgetPieChartCanvas}>
        <Pie data={chartData} options={options} className={styles.chartCanvas} />
      </div>
    </div>
  );
}
