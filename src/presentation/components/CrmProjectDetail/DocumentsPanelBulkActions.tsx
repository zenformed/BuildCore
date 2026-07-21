'use client';

import { useCallback, useState, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import { mapCrmDocumentActionError } from '@/presentation/features/crmProjectDetail/crmDocumentActionErrors';
import { DEMO_DOCUMENT_DOWNLOAD_LOCKED_MESSAGE } from '@/presentation/features/crmProjectDetail/crmProjectDocumentDownloadFeedback';
import { useCorePlatformDegraded } from '@/presentation/hooks/useCorePlatformDegraded';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
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

function DownloadGlyph({ className }: { readonly className?: string }): ReactElement {
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
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

/** Gmail-style bulk download/delete for the Documents panel toolbar. */
export function DocumentsPanelBulkActions(): ReactElement | null {
  const rowSelection = useDocumentRowSelection();
  const docs = content.projectDetail.documents;
  const wf = content.projectDetail.workflow;
  const bulkCopy = content.bulkSelection;
  const bulkDeleteCopy = content.bulkDelete;
  const coreDegraded = useCorePlatformDegraded();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const bulkActions = rowSelection?.bulkActions ?? null;
  const selectedCount = rowSelection?.selectedCount ?? 0;
  const canDownloadSelection =
    bulkActions != null &&
    selectedCount > 0 &&
    bulkActions.canDownload &&
    [...(rowSelection?.selectedIds ?? [])].every((id) =>
      bulkActions.downloadableDocumentIds.has(id)
    );
  const canDeleteSelection =
    bulkActions != null &&
    selectedCount > 0 &&
    bulkActions.canDelete &&
    [...(rowSelection?.selectedIds ?? [])].every((id) =>
      (bulkActions.deletableDocumentIds ?? bulkActions.documentsById).has(id)
    );
  const showChrome =
    rowSelection != null &&
    selectedCount > 0 &&
    bulkActions != null &&
    (canDownloadSelection || canDeleteSelection);

  const downloadLabel =
    selectedCount === 1 ? docs.bulkDownloadDocument : docs.bulkDownloadDocuments;

  const handleDownload = useCallback(async () => {
    if (rowSelection == null || bulkActions == null || !canDownloadSelection) return;
    if (busy) return;
    if (coreDegraded) {
      bulkActions.onFeedback({ kind: 'error', message: wf.coreServicesUnavailable });
      return;
    }
    if (isDemoRuntimeClient()) {
      bulkActions.onFeedback({
        kind: 'success',
        message: DEMO_DOCUMENT_DOWNLOAD_LOCKED_MESSAGE,
      });
      return;
    }

    const ids = [...rowSelection.selectedIds];
    setBusy(true);
    try {
      await bulkActions.onDownloadDocuments(ids);
      rowSelection.clearSelection();
    } catch (err) {
      bulkActions.onFeedback({
        kind: 'error',
        message: mapCrmDocumentActionError(err, wf) || docs.bulkDownloadFailed,
      });
    } finally {
      setBusy(false);
    }
  }, [
    bulkActions,
    busy,
    canDownloadSelection,
    coreDegraded,
    docs.bulkDownloadFailed,
    rowSelection,
    wf,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (rowSelection == null || bulkActions == null || !canDeleteSelection) return;
    const ids = [...rowSelection.selectedIds];
    // Close chrome immediately so the gallery feels instantaneous.
    setDeleteConfirmOpen(false);
    rowSelection.clearSelection();
    setBusy(true);
    try {
      const { deletedCount, failedCount } = await bulkActions.onDeleteDocuments(ids);
      if (failedCount > 0 && deletedCount === 0) {
        bulkActions.onFeedback({ kind: 'error', message: bulkDeleteCopy.failed });
      } else if (failedCount > 0) {
        bulkActions.onFeedback({
          kind: 'error',
          message: bulkDeleteCopy.partialFailure(deletedCount, failedCount),
        });
      } else {
        bulkActions.onFeedback({
          kind: 'success',
          message: bulkDeleteCopy.success(deletedCount, docs.bulkDeleteItemLabel),
        });
      }
    } finally {
      setBusy(false);
    }
  }, [
    bulkActions,
    bulkDeleteCopy,
    canDeleteSelection,
    docs.bulkDeleteItemLabel,
    rowSelection,
  ]);

  if (!showChrome || bulkActions == null || rowSelection == null) {
    return null;
  }

  return (
    <>
      <span className={styles.workflowBulkActions} role="toolbar" aria-label={bulkCopy.toolbarAriaLabel}>
        {canDownloadSelection ? (
          <button
            type="button"
            className={styles.workflowBulkActionBtn}
            disabled={busy}
            title={downloadLabel}
            aria-label={downloadLabel}
            onClick={() => {
              void handleDownload();
            }}
          >
            <DownloadGlyph className={styles.workflowBulkActionGlyph} />
          </button>
        ) : null}
        {canDeleteSelection ? (
          <button
            type="button"
            className={styles.workflowBulkActionBtn}
            disabled={busy}
            title={bulkCopy.deleteSelected}
            aria-label={bulkCopy.deleteSelected}
            onClick={() => {
              bulkActions.guardDelete(() => {
                setDeleteConfirmOpen(true);
              });
            }}
          >
            <TrashGlyph className={styles.workflowBulkActionGlyph} />
          </button>
        ) : null}
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
        title={docs.bulkDeleteConfirmTitle(selectedCount)}
        confirmLabel={wf.documentDelete}
        cancelLabel={bulkDeleteCopy.cancelLabel}
        variant="danger"
      />
    </>
  );
}
