'use client';

import type { ReactElement, ReactNode } from 'react';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import { resolveWorkflowOpsGridClassName } from './WorkflowTaskTableCustomColumns';
import { useBuildCoreWorkflowTaskTableColumns } from '@/presentation/providers/BuildCoreWorkflowTaskTableColumnsProvider';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksTableColumnHeaderProps = {
  readonly showAmount?: boolean;
  readonly showStatusRefresh?: boolean;
  readonly leadingFilter?: ReactNode;
  readonly onRefreshTasks?: () => Promise<void>;
};

export function WorkflowTasksTableColumnHeader({
  showAmount = false,
  showStatusRefresh = false,
  leadingFilter = null,
  onRefreshTasks,
}: WorkflowTasksTableColumnHeaderProps): ReactElement {
  const { gridClassName } = useBuildCoreWorkflowTaskTableColumns();
  const enableCustomColumns = !showAmount;

  return (
    <WorkflowTaskTableHeaderRow
      showAmount={showAmount}
      enableCustomColumns={enableCustomColumns}
      showStatusRefresh={showStatusRefresh}
      leadingFilter={leadingFilter}
      onRefreshTasks={onRefreshTasks}
      gridClassName={
        enableCustomColumns
          ? resolveWorkflowOpsGridClassName(true, gridClassName)
          : undefined
      }
      rowClassName={styles.workflowUnifiedTableHeader}
    />
  );
}
