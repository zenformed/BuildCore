'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import type { CrmProjectBudgetSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBudgetCategory } from '@/presentation/features/crmProjectDetail/budgetCategoryLabels';
import {
  budgetCategoryColorByCategory,
  buildBudgetCategoryPieSlices,
} from '@/presentation/features/crmProjectDetail/budgetCategoryPieModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { BudgetCategoryPieChart } from './BudgetCategoryPieChart';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import styles from './ProjectDetail.module.css';

export type ProjectCostSummaryProps = {
  budget: CrmProjectBudgetSummary;
};

export function ProjectCostSummary({ budget }: ProjectCostSummaryProps): ReactElement {
  const p = content.projectDetail.budget.pl;
  const { slices } = useMemo(
    () => buildBudgetCategoryPieSlices(budget.categoryCosts),
    [budget.categoryCosts]
  );
  const colorByCategory = useMemo(() => budgetCategoryColorByCategory(slices), [slices]);

  return (
    <aside className={`${styles.paymentsPanel} ${styles.budgetSummaryPanel}`} aria-labelledby="project-cost-heading">
      <div className={styles.cardTitleRow}>
        <h3 id="project-cost-heading" className={styles.cardTitle}>
          {p.title}
        </h3>
        <DetailPanelHeaderButton variant="download" title={p.generatePl} onClick={() => undefined} />
      </div>

      {budget.categoryCosts.length > 0 ? (
        <div className={styles.budgetPlSplit}>
          <div className={styles.budgetCategoryTableWrap}>
            <div className={`${styles.tableHeader} ${styles.budgetCategoryGrid}`} role="row">
              <span role="columnheader">{p.categoryName}</span>
              <span role="columnheader">{p.categoryCost}</span>
            </div>
            {budget.categoryCosts.map((row) => {
              const color = colorByCategory.get(row.category) ?? '#64748b';
              return (
                <div key={row.category} className={`${styles.tableRow} ${styles.budgetCategoryGrid}`} role="row">
                  <span className={styles.budgetCategoryNameCell}>
                    <span
                      className={styles.budgetCategorySwatch}
                      style={{ background: color }}
                      aria-hidden
                    />
                    {formatBudgetCategory(row.category)}
                  </span>
                  <span>{formatCentsAsUsd(row.costCents)}</span>
                </div>
              );
            })}
          </div>
          <BudgetCategoryPieChart categoryCosts={budget.categoryCosts} />
        </div>
      ) : (
        <p className={styles.subtitle}>{p.noCategories}</p>
      )}
    </aside>
  );
}
