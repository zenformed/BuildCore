'use client';

import type { ReactElement, ReactNode } from 'react';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import { DocumentsGallerySelectCircle } from './DocumentsGallerySelectCircle';
import { DocumentsPanelBulkActions } from './DocumentsPanelBulkActions';
import { WorkflowTableStatusRefresh } from './WorkflowTableStatusRefresh';
import styles from './ProjectDetail.module.css';

export type DocumentsListHeaderRowProps = {
  readonly leadingFilter?: ReactNode;
  readonly onRefresh: () => Promise<void>;
  readonly onError?: (message: string) => void;
  /** When false, hide the inline status refresh (e.g. moved to folder tab bar). */
  readonly showStatusRefresh?: boolean;
};

/**
 * Desktop documents chrome: select-all (after selection) | filter caret | refresh ↔ bulk actions.
 * Mirrors WorkflowTaskTableHeaderRow / BudgetTableHeaderRow (not the mobile labeled row).
 */
export function DocumentsListHeaderRow({
  leadingFilter = null,
  onRefresh,
  onError,
  showStatusRefresh = true,
}: DocumentsListHeaderRowProps): ReactElement | null {
  const rowSelection = useDocumentRowSelection();
  if (rowSelection == null) return null;

  const hasSelection = rowSelection.selectedCount > 0;
  const bulk = rowSelection.bulkActions;
  const showBulkChrome =
    hasSelection && bulk != null && (bulk.canDelete || bulk.canDownload);
  const showSelect = hasSelection;
  const showPrimary =
    leadingFilter != null || showBulkChrome || (showStatusRefresh && !showBulkChrome);

  if (!showSelect && !showPrimary) return null;

  return (
    <div className={styles.documentsListHeader} role="row">
      {showSelect ? (
        <span role="columnheader" className={styles.workflowSelectHeader}>
          <DocumentsGallerySelectCircle
            checked={rowSelection.allVisibleSelected}
            indeterminate={rowSelection.someVisibleSelected}
            visible
            ariaLabel={rowSelection.selectAllAriaLabel}
            onChange={() => rowSelection.onToggleAllVisible()}
            className={styles.documentsListHeaderSelectCircle}
          />
        </span>
      ) : null}
      {showPrimary ? (
        <span role="columnheader" className={styles.workflowPrimaryHeader}>
          {leadingFilter}
          {showBulkChrome ? (
            <DocumentsPanelBulkActions />
          ) : showStatusRefresh ? (
            <WorkflowTableStatusRefresh onRefresh={onRefresh} onError={onError} />
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
