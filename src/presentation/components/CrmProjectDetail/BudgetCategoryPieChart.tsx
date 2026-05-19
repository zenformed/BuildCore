'use client';

import type { ReactElement } from 'react';
import type { CrmBudgetCategoryCost } from '@/domain/crm';
import { buildBudgetCategoryPieSlices } from '@/presentation/features/crmProjectDetail/budgetCategoryPieModel';
import styles from './ProjectDetail.module.css';

type BudgetCategoryPieChartProps = {
  categoryCosts: readonly CrmBudgetCategoryCost[];
};

export function BudgetCategoryPieChart({ categoryCosts }: BudgetCategoryPieChartProps): ReactElement {
  const { total, gradient } = buildBudgetCategoryPieSlices(categoryCosts);

  if (total <= 0) {
    return <p className={styles.budgetPieEmpty}>No cost data yet.</p>;
  }

  return (
    <div className={styles.budgetPieChartSplitWrap}>
      <div
        className={styles.budgetPieChartSplit}
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label="Cost breakdown by category"
      />
    </div>
  );
}
