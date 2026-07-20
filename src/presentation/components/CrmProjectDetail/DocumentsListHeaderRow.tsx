'use client';

import type { ReactElement, ReactNode } from 'react';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import { DocumentsPanelBulkActions } from './DocumentsPanelBulkActions';
import { WorkflowTableStatusRefresh } from './WorkflowTableStatusRefresh';
import styles from './ProjectDetail.module.css';

export type DocumentsListHeaderRowProps = {
  readonly leadingFilter?: ReactNode;
  readonly onRefresh: () => Promise<void>;
  readonly onError?: (message: string) => void;
};

/**
 * Desktop documents chrome: select-all | filter caret | refresh ↔ bulk actions.
 * Mirrors WorkflowTaskTableHeaderRow / BudgetTableHeaderRow (not the mobile labeled row).
 */
export function DocumentsListHeaderRow({
  leadingFilter = null,
  onRefresh,
  onError,
}: DocumentsListHeaderRowProps): ReactElement | null {
  const rowSelection = useDocumentRowSelection();
  if (rowSelection == null) return null;

  const hasSelection = rowSelection.selectedCount > 0;
  const bulk = rowSelection.bulkActions;
  const showBulkChrome =
    hasSelection && bulk != null && (bulk.canDelete || bulk.canDownload);

  return (
    <div className={styles.documentsListHeader} role="row">
      <span role="columnheader" className={styles.workflowSelectHeader}>
        <BulkSelectCheckbox
          checked={rowSelection.allVisibleSelected}
          indeterminate={rowSelection.someVisibleSelected}
          ariaLabel={rowSelection.selectAllAriaLabel}
          onChange={() => rowSelection.onToggleAllVisible()}
        />
      </span>
      <span role="columnheader" className={styles.workflowPrimaryHeader}>
        {leadingFilter}
        {showBulkChrome ? (
          <DocumentsPanelBulkActions />
        ) : (
          <WorkflowTableStatusRefresh onRefresh={onRefresh} onError={onError} />
        )}
      </span>
    </div>
  );
}
