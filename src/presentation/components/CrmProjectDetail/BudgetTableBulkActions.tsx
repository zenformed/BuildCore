'use client';

import { useCallback, useState, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { useBudgetEntryRowSelection } from '@/presentation/features/crmProjectDetail/budgetEntryRowSelectionContext';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import styles from './ProjectDetail.module.css';

function TrashGlyph({ className }: { readonly className?: string }): ReactElement {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/** Gmail-style bulk delete shown in the budget primary header when rows are selected. */
export function BudgetTableBulkActions(): ReactElement | null {
  const rowSelection = useBudgetEntryRowSelection();
  const { setToast } = useProjectDetailShell();
  const b = content.projectDetail.budget;
  const bulkCopy = content.bulkSelection;
  const bulkDeleteCopy = content.bulkDelete;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const bulkActions = rowSelection?.bulkActions ?? null;
  const selectedCount = rowSelection?.selectedCount ?? 0;
  const showChrome =
    rowSelection != null && selectedCount > 0 && bulkActions?.canDelete === true;

  const handleConfirmDelete = useCallback(async () => {
    if (rowSelection == null || bulkActions == null || selectedCount === 0) return;
    const ids = [...rowSelection.selectedIds];
    setBusy(true);
    try {
      const { deletedCount, failedCount } = await bulkActions.onDeleteEntries(ids);
      if (failedCount > 0 && deletedCount === 0) {
        setToast({ kind: 'error', message: bulkDeleteCopy.failed });
      } else if (failedCount > 0) {
        setToast({
          kind: 'error',
          message: bulkDeleteCopy.partialFailure(deletedCount, failedCount),
        });
      } else {
        setToast({
          kind: 'success',
          message: bulkDeleteCopy.success(deletedCount, b.bulkDeleteItemLabel),
        });
      }
      setDeleteConfirmOpen(false);
      rowSelection.clearSelection();
    } finally {
      setBusy(false);
    }
  }, [b.bulkDeleteItemLabel, bulkActions, bulkDeleteCopy, rowSelection, selectedCount, setToast]);

  if (!showChrome || bulkActions == null || rowSelection == null) {
    return null;
  }

  return (
    <>
      <span className={styles.workflowBulkActions} role="toolbar" aria-label={bulkCopy.toolbarAriaLabel}>
        <button
          type="button"
          className={styles.workflowBulkActionBtn}
          disabled={busy}
          title={bulkCopy.deleteSelected}
          aria-label={bulkCopy.deleteSelected}
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <TrashGlyph className={styles.workflowBulkActionGlyph} />
        </button>
      </span>
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (busy) return;
          setDeleteConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        title={b.bulkDeleteConfirmTitle(selectedCount)}
        confirmLabel={b.deleteItemConfirmLabel}
        cancelLabel={b.deleteItemCancelLabel}
        variant="danger"
      />
    </>
  );
}
