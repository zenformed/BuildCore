'use client';

import type { ReactElement, ReactNode } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import { useBudgetEntryRowSelection } from '@/presentation/features/crmProjectDetail/budgetEntryRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { BudgetTableBulkActions } from './BudgetTableBulkActions';
import { WorkflowTableStatusRefresh } from './WorkflowTableStatusRefresh';
import styles from './ProjectDetail.module.css';

export type BudgetTableHeaderRowProps = {
  readonly leadingFilter?: ReactNode;
};

export function BudgetTableHeaderRow({
  leadingFilter = null,
}: BudgetTableHeaderRowProps): ReactElement {
  const cols = content.projectDetail.budget.columns;
  const rowSelection = useBudgetEntryRowSelection();
  const { refreshBudgetSection, setToast } = useProjectDetailShell();
  const hasSelection = (rowSelection?.selectedCount ?? 0) > 0;
  const showBulkChrome = hasSelection && rowSelection?.bulkActions?.canDelete === true;

  return (
    <div
      className={`${styles.tableHeader} ${styles.budgetGrid} ${styles.budgetTableHeader}`}
      role="row"
    >
      {rowSelection != null ? (
        <span role="columnheader" className={styles.workflowSelectHeader}>
          <BulkSelectCheckbox
            checked={rowSelection.allVisibleSelected}
            indeterminate={rowSelection.someVisibleSelected}
            ariaLabel={rowSelection.selectAllAriaLabel}
            onChange={() => rowSelection.onToggleAllVisible()}
          />
        </span>
      ) : (
        <span role="columnheader" className={styles.workflowSelectHeader} aria-hidden />
      )}
      <span
        role="columnheader"
        className={styles.workflowPrimaryHeader}
        aria-label={showBulkChrome ? undefined : cols.itemName}
      >
        {leadingFilter}
        {showBulkChrome ? (
          <BudgetTableBulkActions />
        ) : (
          <WorkflowTableStatusRefresh
            onRefresh={refreshBudgetSection}
            onError={(message) => setToast({ kind: 'error', message })}
          />
        )}
      </span>
      <span role="columnheader">{cols.category}</span>
      <span role="columnheader">{cols.cost}</span>
      <span role="columnheader">{cols.budget}</span>
      <span role="columnheader">{cols.remaining}</span>
      <span role="columnheader">{cols.costDate}</span>
      <span role="columnheader">{cols.documents}</span>
      <span role="columnheader" className={styles.taskDeleteHeader} aria-hidden />
    </div>
  );
}
