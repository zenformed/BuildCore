'use client';

import type { ReactElement } from 'react';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksTableColumnHeaderProps = {
  readonly showAmount?: boolean;
};

export function WorkflowTasksTableColumnHeader({
  showAmount = false,
}: WorkflowTasksTableColumnHeaderProps): ReactElement {
  return (
    <WorkflowTaskTableHeaderRow
      showAmount={showAmount}
      rowClassName={styles.workflowUnifiedTableHeader}
    />
  );
}
