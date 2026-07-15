'use client';

import { useCallback, useMemo, useRef, useState, type ReactElement } from 'react';
import type { CrmWorkflowTask, WorkflowTaskStatus } from '@/domain/crm';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { archiveCrmWorkflowTask, updateCrmWorkflowTask } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';
import { notifyWorkflowTaskAssigned } from '@/infrastructure/crm/api/notifyWorkflowTaskAssigned';
import { notifyWorkflowTaskCustomer } from '@/infrastructure/crm/api/notifyWorkflowTaskCustomer';
import { DEMO_COMMUNICATION_SIMULATED_MESSAGE } from '@/infrastructure/demo/demoSafetyPolicy';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import { validateWorkflowTaskStatusChange } from '@/presentation/features/crmProjectDetail/workflowTaskDocumentsValidation';
import { formatWorkflowStatus } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { workflowTaskAssignedNotifyPromptFromTask } from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

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

function StatusGlyph({ className }: { readonly className?: string }): ReactElement {
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
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function MailGlyph({ className }: { readonly className?: string }): ReactElement {
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
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function resolveSelectedTasks(
  selectedIds: ReadonlySet<string>,
  tasksById: ReadonlyMap<string, CrmWorkflowTask>
): CrmWorkflowTask[] {
  const tasks: CrmWorkflowTask[] = [];
  for (const id of selectedIds) {
    const task = tasksById.get(id);
    if (task != null) tasks.push(task);
  }
  return tasks;
}

/** Gmail-style bulk actions shown in the primary header when rows are selected. */
export function WorkflowTableBulkActions(): ReactElement | null {
  const rowSelection = useWorkflowTaskRowSelection();
  const { project, refreshWorkflowTasks, refreshRollupIndexes, setToast } = useProjectDetailShell();
  const wf = content.projectDetail.workflow;
  const bulkCopy = content.bulkSelection;
  const bulkDeleteCopy = content.bulkDelete;
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notifyConfirmOpen, setNotifyConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const statusAnchorRef = useRef<HTMLSpanElement>(null);

  const bulkActions = rowSelection?.bulkActions ?? null;
  const selectedCount = rowSelection?.selectedCount ?? 0;
  const selectedTasks = useMemo(
    () =>
      rowSelection != null && bulkActions != null
        ? resolveSelectedTasks(rowSelection.selectedIds, bulkActions.tasksById)
        : [],
    [bulkActions, rowSelection]
  );

  const canChangeAnyStatus =
    bulkActions != null && (bulkActions.canApprove || bulkActions.canChangeNonDoneStatus);
  const canNotify = bulkActions?.canNotifyAssigned === true;
  const showChrome =
    rowSelection != null &&
    selectedCount > 0 &&
    bulkActions != null &&
    (bulkActions.canDelete || canChangeAnyStatus || canNotify);

  const isStatusOptionDisabled = useCallback(
    (status: WorkflowTaskStatus) => {
      if (busy || bulkActions == null) return true;
      if (status === 'done') return !bulkActions.canApprove;
      return !bulkActions.canChangeNonDoneStatus;
    },
    [busy, bulkActions]
  );

  const handleApplyStatus = useCallback(
    async (status: WorkflowTaskStatus) => {
      if (rowSelection == null || bulkActions == null || selectedTasks.length === 0) return;
      if (isStatusOptionDisabled(status)) return;
      setStatusMenuOpen(false);
      setBusy(true);
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      try {
        for (const task of selectedTasks) {
          if (task.status === status) {
            skippedCount += 1;
            continue;
          }
          const docCount = bulkActions.docCountByTaskId.get(task.id) ?? 0;
          const validation = validateWorkflowTaskStatusChange(task, status, docCount);
          if (!validation.ok) {
            skippedCount += 1;
            continue;
          }
          try {
            const updated = await updateCrmWorkflowTask(crmRepositories, {
              taskId: task.id,
              status,
            });
            if (updated == null) {
              failedCount += 1;
              continue;
            }
            await bulkActions.onTaskUpdated(updated);
            updatedCount += 1;
          } catch {
            failedCount += 1;
          }
        }
        if (failedCount > 0 && updatedCount === 0) {
          setToast({ kind: 'error', message: wf.bulkStatusChangeFailed });
        } else if (failedCount > 0 || (skippedCount > 0 && updatedCount === 0)) {
          setToast({
            kind: updatedCount > 0 ? 'success' : 'error',
            message: wf.bulkStatusChangePartial(updatedCount, skippedCount + failedCount),
          });
        } else if (updatedCount > 0) {
          setToast({ kind: 'success', message: wf.bulkStatusChangeSuccess(updatedCount) });
        }
        rowSelection.clearSelection();
      } finally {
        setBusy(false);
      }
    },
    [bulkActions, isStatusOptionDisabled, rowSelection, selectedTasks, setToast, wf]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (rowSelection == null || selectedTasks.length === 0) return;
    setBusy(true);
    let deletedCount = 0;
    let failedCount = 0;
    try {
      for (const task of selectedTasks) {
        try {
          await archiveCrmWorkflowTask(crmRepositories, task.id);
          deletedCount += 1;
        } catch {
          failedCount += 1;
        }
      }
      if (deletedCount > 0) {
        await refreshWorkflowTasks();
        refreshRollupIndexes();
      }
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
          message: bulkDeleteCopy.success(deletedCount, wf.bulkDeleteItemLabel),
        });
      }
      setDeleteConfirmOpen(false);
      rowSelection.clearSelection();
    } finally {
      setBusy(false);
    }
  }, [
    bulkDeleteCopy,
    refreshRollupIndexes,
    refreshWorkflowTasks,
    rowSelection,
    selectedTasks,
    setToast,
    wf.bulkDeleteItemLabel,
  ]);

  const handleConfirmNotify = useCallback(async () => {
    if (rowSelection == null || selectedTasks.length === 0) return;
    setBusy(true);
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const projectContact = project.summary.contact;
    try {
      for (const task of selectedTasks) {
        const prompt = workflowTaskAssignedNotifyPromptFromTask(task, projectContact);
        if (prompt == null || prompt.recipientEmail == null) {
          skippedCount += 1;
          continue;
        }
        try {
          if (prompt.kind === 'customer') {
            await notifyWorkflowTaskCustomer(task.id);
          } else {
            await notifyWorkflowTaskAssigned(task.id);
          }
          sentCount += 1;
        } catch {
          failedCount += 1;
        }
      }
      if (sentCount === 0 && failedCount === 0) {
        setToast({ kind: 'error', message: wf.bulkNotifyNoneEligible });
      } else if (failedCount > 0 && sentCount === 0) {
        setToast({ kind: 'error', message: wf.bulkNotifyFailed });
      } else if (failedCount > 0 || skippedCount > 0) {
        setToast({
          kind: sentCount > 0 ? 'success' : 'error',
          message: wf.bulkNotifyPartial(sentCount, skippedCount + failedCount),
        });
      } else {
        setToast({
          kind: 'success',
          message: isDemoRuntimeClient()
            ? DEMO_COMMUNICATION_SIMULATED_MESSAGE
            : wf.bulkNotifySuccess(sentCount),
        });
      }
      setNotifyConfirmOpen(false);
      rowSelection.clearSelection();
    } finally {
      setBusy(false);
    }
  }, [project.summary.contact, rowSelection, selectedTasks, setToast, wf]);

  if (!showChrome || bulkActions == null || rowSelection == null) {
    return null;
  }

  return (
    <>
      <span className={styles.workflowBulkActions} role="toolbar" aria-label={bulkCopy.toolbarAriaLabel}>
        {bulkActions.canDelete ? (
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
        ) : null}
        {canChangeAnyStatus ? (
          <span ref={statusAnchorRef} className={styles.workflowBulkStatusWrap}>
            <button
              type="button"
              className={styles.workflowBulkActionBtn}
              disabled={busy}
              title={wf.bulkChangeStatus}
              aria-label={wf.bulkChangeStatus}
              aria-expanded={statusMenuOpen}
              onClick={() => setStatusMenuOpen((open) => !open)}
            >
              <StatusGlyph className={styles.workflowBulkActionGlyph} />
            </button>
            <WorkflowInlineMenu
              open={statusMenuOpen}
              onClose={() => setStatusMenuOpen(false)}
              anchorRef={statusAnchorRef}
            >
              {WORKFLOW_TASK_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={styles.inlineMenuPillOption}
                  disabled={isStatusOptionDisabled(status)}
                  onClick={() => void handleApplyStatus(status)}
                >
                  <span className={`${styles.statusDotIndicator} ${statusBadgeClass(status)}`}>
                    <span className={styles.statusDot} aria-hidden />
                    <span className={styles.statusDotText}>{formatWorkflowStatus(status)}</span>
                  </span>
                </button>
              ))}
            </WorkflowInlineMenu>
          </span>
        ) : null}
        {canNotify ? (
          <button
            type="button"
            className={styles.workflowBulkActionBtn}
            disabled={busy}
            title={wf.bulkNotifyAssigned}
            aria-label={wf.bulkNotifyAssigned}
            onClick={() => setNotifyConfirmOpen(true)}
          >
            <MailGlyph className={styles.workflowBulkActionGlyph} />
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
        title={wf.bulkArchiveConfirmTitle(selectedCount)}
        confirmLabel={wf.archiveTaskConfirmLabel}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="danger"
      />
      <ConfirmModal
        isOpen={notifyConfirmOpen}
        onClose={() => {
          if (busy) return;
          setNotifyConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleConfirmNotify();
        }}
        title={wf.bulkNotifyConfirmTitle(selectedCount)}
        confirmLabel={wf.bulkNotifyConfirmLabel}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="primary"
        hideIcon
      />
    </>
  );
}
