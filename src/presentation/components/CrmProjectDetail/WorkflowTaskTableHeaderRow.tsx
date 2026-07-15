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
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import {
  EditableFieldLabelHeader,
  WorkflowTaskActionsColumnHeader,
} from './EditableFieldLabelHeader';
import { WorkflowTableStatusRefresh } from './WorkflowTableStatusRefresh';
import { WorkflowTableBulkActions } from './WorkflowTableBulkActions';
import { WorkflowTaskTableCustomColumnHeaders } from './WorkflowTaskTableCustomColumns';
import { PaymentTableCustomColumnHeaders } from './PaymentTableCustomColumns';
import styles from './ProjectDetail.module.css';

export type WorkflowTaskTableHeaderRowProps = {
  readonly context?: BuildCoreFieldLabelContext;
  readonly showAmount?: boolean;
  readonly showNotes?: boolean;
  readonly enableCustomColumns?: boolean;
  readonly enablePaymentCustomColumns?: boolean;
  readonly trailingHeaders?: ReactNode;
  readonly rowClassName?: string;
  readonly gridClassName?: string;
  /** Ops workflow: select | unlabeled primary (status dot + task; refresh in that header). */
  readonly showStatusRefresh?: boolean;
  /** Gmail-style filter caret shown between select and refresh/bulk actions. */
  readonly leadingFilter?: ReactNode;
};

export function WorkflowTaskTableHeaderRow({
  context = 'workflow',
  showAmount = false,
  showNotes = true,
  enableCustomColumns = false,
  enablePaymentCustomColumns = false,
  trailingHeaders = null,
  rowClassName,
  gridClassName,
  showStatusRefresh = false,
  leadingFilter = null,
}: WorkflowTaskTableHeaderRowProps): ReactElement {
  const cols = content.projectDetail.workflow.columns;
  const rowSelection = useWorkflowTaskRowSelection();
  const { refreshWorkflowTasks, setToast } = useProjectDetailShell();
  const showOpsLeading = showStatusRefresh && !showAmount;
  const hasSelection = (rowSelection?.selectedCount ?? 0) > 0;
  const bulk = rowSelection?.bulkActions;
  const showBulkChrome =
    hasSelection &&
    bulk != null &&
    (bulk.canDelete ||
      bulk.canApprove ||
      bulk.canChangeNonDoneStatus ||
      bulk.canNotifyAssigned);
  const gridClass =
    gridClassName !== undefined
      ? gridClassName
      : showAmount
        ? `${styles.workflowGrid} ${styles.workflowGridPayments}`
        : styles.workflowGrid;
  const rowClass = [
    styles.tableHeader,
    styles.workflowTaskTableHeader,
    gridClass,
    rowClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClass} role="row">
      {rowSelection != null && !showAmount ? (
        <span role="columnheader" className={styles.workflowSelectHeader}>
          <BulkSelectCheckbox
            checked={rowSelection.allVisibleSelected}
            indeterminate={rowSelection.someVisibleSelected}
            ariaLabel={rowSelection.selectAllAriaLabel}
            onChange={() => rowSelection.onToggleAllVisible()}
          />
        </span>
      ) : null}
      {showOpsLeading ? (
        <span
          role="columnheader"
          className={styles.workflowPrimaryHeader}
          aria-label={showBulkChrome ? undefined : `${cols.task}, ${cols.status}`}
        >
          {leadingFilter}
          {showBulkChrome ? (
            <WorkflowTableBulkActions />
          ) : (
            <WorkflowTableStatusRefresh
              onRefresh={refreshWorkflowTasks}
              onError={(message) => setToast({ kind: 'error', message })}
            />
          )}
        </span>
      ) : (
        <>
          <EditableFieldLabelHeader
            fieldKey={WORKFLOW_TASK_STATUS_FIELD_KEY}
            context={context}
            align="start"
            className={styles.workflowStatusLabelHeader}
          />
          <EditableFieldLabelHeader
            fieldKey={WORKFLOW_TASK_TASK_FIELD_KEY}
            context={context}
            align="start"
          />
        </>
      )}
      {enableCustomColumns ? <WorkflowTaskTableCustomColumnHeaders /> : null}
      {enablePaymentCustomColumns ? <PaymentTableCustomColumnHeaders /> : null}
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
      {showAmount ? <span role="columnheader">{cols.amount}</span> : null}
      <EditableFieldLabelHeader
        fieldKey={WORKFLOW_TASK_DUE_FIELD_KEY}
        context={context}
        align="center"
        className={styles.workflowDueHeader}
      />
      {trailingHeaders}
      <WorkflowTaskActionsColumnHeader context={context} />
    </div>
  );
}
