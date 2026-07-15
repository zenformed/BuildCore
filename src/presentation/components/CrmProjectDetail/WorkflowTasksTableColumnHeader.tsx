'use client';

import type { ReactElement } from 'react';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import { resolveWorkflowOpsGridClassName } from './WorkflowTaskTableCustomColumns';
import { useBuildCoreWorkflowTaskTableColumns } from '@/presentation/providers/BuildCoreWorkflowTaskTableColumnsProvider';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksTableColumnHeaderProps = {
  readonly showAmount?: boolean;
  readonly showStatusRefresh?: boolean;
};

export function WorkflowTasksTableColumnHeader({
  showAmount = false,
  showStatusRefresh = false,
}: WorkflowTasksTableColumnHeaderProps): ReactElement {
  const { gridClassName } = useBuildCoreWorkflowTaskTableColumns();
  const enableCustomColumns = !showAmount;

  return (
    <WorkflowTaskTableHeaderRow
      showAmount={showAmount}
      enableCustomColumns={enableCustomColumns}
      showStatusRefresh={showStatusRefresh}
      gridClassName={
        enableCustomColumns
          ? resolveWorkflowOpsGridClassName(true, gridClassName)
          : undefined
      }
      rowClassName={styles.workflowUnifiedTableHeader}
    />
  );
}
