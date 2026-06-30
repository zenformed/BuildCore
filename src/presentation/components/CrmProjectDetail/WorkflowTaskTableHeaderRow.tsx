'use client';

import type { ReactElement, ReactNode } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { BuildCoreFieldLabelContext } from '@/domain/buildcore/fieldLabelMeanings';
import {
  WORKFLOW_TASK_ASSIGNED_FIELD_KEY,
  WORKFLOW_TASK_DOCUMENTS_FIELD_KEY,
  WORKFLOW_TASK_DUE_FIELD_KEY,
  WORKFLOW_TASK_NOTES_FIELD_KEY,
  WORKFLOW_TASK_STATUS_FIELD_KEY,
  WORKFLOW_TASK_TASK_FIELD_KEY,
} from '@/domain/buildcore/fieldLabels';
import {
  EditableFieldLabelHeader,
  WorkflowTaskActionsColumnHeader,
} from './EditableFieldLabelHeader';
import { WorkflowTaskTableCustomColumnHeaders } from './WorkflowTaskTableCustomColumns';
import styles from './ProjectDetail.module.css';

export type WorkflowTaskTableHeaderRowProps = {
  readonly context?: BuildCoreFieldLabelContext;
  readonly showAmount?: boolean;
  readonly showNotes?: boolean;
  readonly enableCustomColumns?: boolean;
  readonly trailingHeaders?: ReactNode;
  readonly rowClassName?: string;
  readonly gridClassName?: string;
};

export function WorkflowTaskTableHeaderRow({
  context = 'workflow',
  showAmount = false,
  showNotes = true,
  enableCustomColumns = false,
  trailingHeaders = null,
  rowClassName,
  gridClassName,
}: WorkflowTaskTableHeaderRowProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const gridClass =
    gridClassName !== undefined
      ? gridClassName
      : showAmount
        ? `${styles.workflowGrid} ${styles.workflowGridPayments}`
        : styles.workflowGrid;
  const rowClass = [
    styles.tableHeader,
    !showAmount ? styles.workflowTaskTableHeader : '',
    gridClass,
    rowClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClass} role="row">
      <EditableFieldLabelHeader
        fieldKey={WORKFLOW_TASK_STATUS_FIELD_KEY}
        context={context}
        align="center"
      />
      <EditableFieldLabelHeader fieldKey={WORKFLOW_TASK_TASK_FIELD_KEY} context={context} align="start" />
      {enableCustomColumns ? <WorkflowTaskTableCustomColumnHeaders /> : null}
      {showAmount ? <span role="columnheader">{cols.amount}</span> : null}
      {showNotes ? (
        <EditableFieldLabelHeader
          fieldKey={WORKFLOW_TASK_NOTES_FIELD_KEY}
          context={context}
          align="start"
          className={styles.workflowNotesHeader}
        />
      ) : null}
      <EditableFieldLabelHeader
        fieldKey={WORKFLOW_TASK_DOCUMENTS_FIELD_KEY}
        context={context}
        align="center"
      />
      <EditableFieldLabelHeader
        fieldKey={WORKFLOW_TASK_ASSIGNED_FIELD_KEY}
        context={context}
        align="center"
      />
      <EditableFieldLabelHeader fieldKey={WORKFLOW_TASK_DUE_FIELD_KEY} context={context} align="center" />
      {trailingHeaders}
      <WorkflowTaskActionsColumnHeader context={context} />
    </div>
  );
}
