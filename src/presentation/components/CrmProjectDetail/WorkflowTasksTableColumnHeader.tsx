'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksTableColumnHeaderProps = {
  readonly showAmount?: boolean;
};

export function WorkflowTasksTableColumnHeader({
  showAmount = false,
}: WorkflowTasksTableColumnHeaderProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const gridClass = showAmount
    ? `${styles.workflowGrid} ${styles.workflowGridPayments}`
    : styles.workflowGrid;

  return (
    <div className={`${styles.tableHeader} ${gridClass} ${styles.workflowUnifiedTableHeader}`} role="row">
      <span role="columnheader">{cols.status}</span>
      <span role="columnheader">{cols.task}</span>
      {showAmount ? <span role="columnheader">{cols.amount}</span> : null}
      <span role="columnheader" className={styles.workflowNotesHeader}>
        {cols.notes}
      </span>
      <span role="columnheader">{cols.documents}</span>
      <span role="columnheader">{cols.assigned}</span>
      <span role="columnheader">{cols.due}</span>
      <span role="columnheader" className={styles.taskDeleteHeader} aria-hidden />
    </div>
  );
}
