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
};

export function WorkflowTasksTableColumnHeader({
  showAmount = false,
  showStatusRefresh = false,
  leadingFilter = null,
}: WorkflowTasksTableColumnHeaderProps): ReactElement {
  const { gridClassName } = useBuildCoreWorkflowTaskTableColumns();
  const enableCustomColumns = !showAmount;

  return (
    <WorkflowTaskTableHeaderRow
      showAmount={showAmount}
      enableCustomColumns={enableCustomColumns}
      showStatusRefresh={showStatusRefresh}
      leadingFilter={leadingFilter}
      gridClassName={
        enableCustomColumns
          ? resolveWorkflowOpsGridClassName(true, gridClassName)
          : undefined
      }
      rowClassName={styles.workflowUnifiedTableHeader}
    />
  );
}
