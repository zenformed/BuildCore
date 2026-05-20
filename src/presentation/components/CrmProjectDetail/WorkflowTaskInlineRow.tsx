'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS,
} from '@/domain/crm/documentUpload';
import { isPaymentWorkflowTask, type CrmDocumentMetadata, type CrmWorkflowTask, type WorkflowTaskStatus } from '@/domain/crm';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { parseUsdInputToCents } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { centsToUsdInput } from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useWorkflowTaskPatch } from '@/presentation/features/crmProjectDetail/useWorkflowTaskPatch';
import { validateWorkflowTaskStatusChange } from '@/presentation/features/crmProjectDetail/workflowTaskDocumentsValidation';
import {
  dueInputValueToIso,
  workflowTaskDueToInputValue,
} from '@/presentation/features/crmProjectDetail/workflowTaskInlineUtils';
import { useWorkflowTaskDocumentActions } from '@/presentation/features/crmProjectDetail/useWorkflowTaskDocumentActions';
import { useWorkflowTaskRowFileDrop } from '@/presentation/features/crmProjectDetail/useWorkflowTaskRowFileDrop';
import { useAuth } from '@/presentation/hooks/useAuth';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

export type WorkflowTaskInlineRowProps = {
  projectSlug: string;
  task: CrmWorkflowTask;
  docCount: number;
  taskDocuments: readonly CrmDocumentMetadata[];
  showAmountColumn?: boolean;
  isApiSource: boolean;
  onUpdated: (task: CrmWorkflowTask) => Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function WorkflowTaskInlineRow({
  projectSlug,
  task,
  docCount,
  taskDocuments,
  showAmountColumn = false,
  isApiSource,
  onUpdated,
  onTaskError,
  onRequestArchiveTask,
}: WorkflowTaskInlineRowProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const { user } = useAuth();
  const {
    onWorkflowTaskDocumentUploaded,
    onWorkflowTaskDocumentDeleted,
  } = useProjectDetailShell();
  const { saving, patchTask } = useWorkflowTaskPatch(onUpdated);
  const documentActions = useWorkflowTaskDocumentActions({
    projectSlug,
    workflowTaskId: task.id,
    onDocumentUploaded: onWorkflowTaskDocumentUploaded,
    onDocumentDeleted: onWorkflowTaskDocumentDeleted,
    onError: (message) => onTaskError?.(message),
  });
  const documentAccept = BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS.join(',');
  const { rowDragOver, rowDropHandlers } = useWorkflowTaskRowFileDrop(task);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountDraft, setAmountDraft] = useState(centsToUsdInput(task.amountCents));
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const dueInputRef = useRef<HTMLInputElement>(null);

  const assigneeOptions = getWorkflowTaskAssigneeOptions(isApiSource, user?.id, user?.email);
  const dueInputValue = workflowTaskDueToInputValue(task.dueAt);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(task.title);
  }, [editingTitle, task.title]);

  useEffect(() => {
    if (!editingAmount) setAmountDraft(centsToUsdInput(task.amountCents));
  }, [editingAmount, task.amountCents]);

  const closeMenus = useCallback(() => {
    setStatusMenuOpen(false);
    setDocumentsMenuOpen(false);
    setAssigneeMenuOpen(false);
  }, []);

  const reportError = useCallback(
    (err: unknown) => {
      onTaskError?.(err instanceof Error ? err.message : wf.taskSubmitFailed);
    },
    [onTaskError, wf.taskSubmitFailed]
  );

  const saveTitle = useCallback(async () => {
    const title = titleDraft.trim();
    setEditingTitle(false);
    if (!title || title === task.title) {
      setTitleDraft(task.title);
      return;
    }
    try {
      await patchTask({ taskId: task.id, title });
    } catch (err) {
      setTitleDraft(task.title);
      reportError(err);
    }
  }, [patchTask, reportError, task.id, task.title, titleDraft]);

  const saveStatus = useCallback(
    async (status: WorkflowTaskStatus) => {
      setStatusMenuOpen(false);
      if (status === task.status) return;
      const validation = validateWorkflowTaskStatusChange(task, status, docCount);
      if (!validation.ok) {
        onTaskError?.(validation.message);
        return;
      }
      try {
        await patchTask({ taskId: task.id, status });
      } catch (err) {
        reportError(err);
      }
    },
    [docCount, onTaskError, patchTask, reportError, task]
  );

  const isStatusDisabled = useCallback(
    (status: WorkflowTaskStatus) =>
      !validateWorkflowTaskStatusChange(task, status, docCount).ok,
    [docCount, task]
  );

  const saveDocumentsRequired = useCallback(
    async (documentsRequired: boolean) => {
      setDocumentsMenuOpen(false);
      if (documentsRequired === task.documentsRequired) return;
      try {
        await patchTask({ taskId: task.id, documentsRequired });
      } catch (err) {
        reportError(err);
      }
    },
    [patchTask, reportError, task.documentsRequired, task.id]
  );

  const saveAssignee = useCallback(
    async (assignedMemberId: string) => {
      setAssigneeMenuOpen(false);
      const current = task.assignedTo?.id ?? '';
      if (assignedMemberId === current) return;
      try {
        await patchTask({
          taskId: task.id,
          assignedMemberId: assignedMemberId || null,
        });
      } catch (err) {
        reportError(err);
      }
    },
    [patchTask, reportError, task.assignedTo?.id, task.id]
  );

  const saveAmount = useCallback(async () => {
    const amountCents = parseUsdInputToCents(amountDraft);
    if (amountCents == null) {
      onTaskError?.('Amount must be a valid USD value.');
      setAmountDraft(centsToUsdInput(task.amountCents));
      setEditingAmount(false);
      return;
    }
    if (amountCents === task.amountCents) {
      setEditingAmount(false);
      return;
    }
    try {
      await patchTask({ taskId: task.id, amountCents });
      setEditingAmount(false);
    } catch (err) {
      reportError(err);
    }
  }, [amountDraft, onTaskError, patchTask, reportError, task.amountCents, task.id]);

  const saveDue = useCallback(
    async (value: string) => {
      const nextIso = dueInputValueToIso(value);
      const currentIso = task.dueAt;
      if (nextIso === currentIso || (nextIso == null && currentIso == null)) return;
      try {
        await patchTask({ taskId: task.id, dueAt: nextIso });
      } catch (err) {
        reportError(err);
      }
    },
    [patchTask, reportError, task.dueAt, task.id]
  );

  const showAmount = showAmountColumn || isPaymentWorkflowTask(task);
  const rowClass = [
    styles.tableRow,
    showAmount ? `${styles.workflowGrid} ${styles.workflowGridPayments}` : styles.workflowGrid,
    styles.workflowInlineRow,
    rowDragOver ? styles.workflowInlineRow_fileDragOver : '',
  ]
    .filter(Boolean)
    .join(' ');

  const effectiveDocCount = Math.max(docCount, taskDocuments.length);
  const hasDocuments = effectiveDocCount > 0;
  const documentsLabel = hasDocuments
    ? `${effectiveDocCount} ${wf.documentsCountSuffix}`
    : !task.documentsRequired
      ? wf.documentsNotRequired
      : wf.documentsNone;
  const showDocumentsIcon = hasDocuments || task.documentsRequired;

  return (
    <div
      className={rowClass}
      role="row"
      aria-busy={saving || documentActions.uploading}
      {...rowDropHandlers}
    >
      <span className={`${styles.inlineCellWrap} ${styles.workflowStatusCell}`} ref={statusRef}>
        <button
          type="button"
          className={styles.inlinePillBtn}
          disabled={saving}
          aria-expanded={statusMenuOpen}
          onClick={() => {
            setDocumentsMenuOpen(false);
            setAssigneeMenuOpen(false);
            setStatusMenuOpen((open) => !open);
          }}
        >
          <span className={`${styles.statusPill} ${statusBadgeClass(task.status)}`}>
            {formatWorkflowStatus(task.status)}
          </span>
        </button>
        <WorkflowInlineMenu
          open={statusMenuOpen}
          onClose={() => setStatusMenuOpen(false)}
          anchorRef={statusRef}
        >
          {WORKFLOW_TASK_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={styles.inlineMenuPillOption}
              disabled={saving || status === task.status || isStatusDisabled(status)}
              onClick={() => void saveStatus(status)}
            >
              <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
                {formatWorkflowStatus(status)}
              </span>
            </button>
          ))}
        </WorkflowInlineMenu>
      </span>

      <span className={styles.taskTitleCell}>
        {task.status === 'done' ? (
          <span className={styles.taskDoneIcon} title={wf.taskDoneIndicator} aria-label={wf.taskDoneIndicator}>
            ✓
          </span>
        ) : (
          <span className={styles.taskOpenIcon} title={wf.taskOpenIndicator} aria-label={wf.taskOpenIndicator} />
        )}
        {editingTitle ? (
          <input
            className={styles.inlineFieldInput}
            value={titleDraft}
            disabled={saving}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveTitle();
              if (e.key === 'Escape') {
                setTitleDraft(task.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.inlineCellBtn}
            disabled={saving}
            title={task.title}
            onClick={() => {
              closeMenus();
              setTitleDraft(task.title);
              setEditingTitle(true);
            }}
          >
            <span className={styles.taskTitleBtnText}>{task.title}</span>
          </button>
        )}
      </span>

      {showAmount ? (
        <span className={`${styles.inlineAmountCell} ${styles.workflowMetaCell}`}>
          {editingAmount ? (
            <input
              className={styles.inlineFieldInput}
              value={amountDraft}
              disabled={saving}
              inputMode="decimal"
              onChange={(e) => setAmountDraft(e.target.value)}
              onBlur={() => void saveAmount()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveAmount();
                if (e.key === 'Escape') {
                  setAmountDraft(centsToUsdInput(task.amountCents));
                  setEditingAmount(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              className={styles.inlineCellBtn}
              disabled={saving}
              onClick={() => {
                closeMenus();
                setAmountDraft(centsToUsdInput(task.amountCents));
                setEditingAmount(true);
              }}
            >
              {formatCentsAsUsd(task.amountCents ?? 0)}
            </button>
          )}
        </span>
      ) : null}

      <span className={`${styles.inlineCellWrap} ${styles.workflowMetaCell}`} ref={documentsRef}>
        <button
          type="button"
          className={`${styles.inlineCellBtn} ${styles.documentsCell}`}
          disabled={saving}
          aria-expanded={documentsMenuOpen}
          onClick={() => {
            setStatusMenuOpen(false);
            setAssigneeMenuOpen(false);
            setDocumentsMenuOpen((open) => !open);
          }}
        >
          {showDocumentsIcon ? <span className={styles.documentsIcon} aria-hidden /> : null}
          <span
            className={
              !task.documentsRequired && !hasDocuments ? styles.documentsNotRequired : undefined
            }
          >
            {documentsLabel}
          </span>
        </button>
        <input
          ref={documentActions.fileInputRef}
          type="file"
          accept={documentAccept}
          className={styles.hiddenFileInput}
          onChange={(e) => void documentActions.handleFileSelected(e)}
        />
        <WorkflowInlineMenu
          open={documentsMenuOpen}
          onClose={() => setDocumentsMenuOpen(false)}
          anchorRef={documentsRef}
        >
          <button
            type="button"
            className={`${styles.inlineMenuAction} ${styles.inlineMenuUploadAction}`}
            disabled={saving || documentActions.uploading}
            onClick={() => {
              setDocumentsMenuOpen(false);
              documentActions.openFilePicker();
            }}
          >
            <span className={styles.inlineMenuUploadIcon} aria-hidden />
            {wf.documentsUpload}
          </button>
          {taskDocuments.map((doc) => (
            <div key={doc.id} className={styles.inlineMenuDocRow}>
              <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} compact />
              <span className={styles.inlineMenuDocName} title={doc.name}>
                {doc.name}
              </span>
              <button
                type="button"
                className={styles.inlineMenuIconBtn}
                disabled={saving || documentActions.uploading}
                title={wf.documentDownload}
                aria-label={`${wf.documentDownload} ${doc.name}`}
                onClick={() => {
                  setDocumentsMenuOpen(false);
                  void documentActions.downloadDocument(doc.id);
                }}
              >
                <span className={styles.inlineMenuDownloadIcon} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.inlineMenuIconBtn}
                disabled={saving || documentActions.uploading}
                title={wf.documentDelete}
                aria-label={`${wf.documentDelete} ${doc.name}`}
                onClick={() => {
                  setDocumentsMenuOpen(false);
                  void documentActions.deleteDocument(doc.id);
                }}
              >
                <span className={styles.inlineMenuDeleteIcon} aria-hidden />
              </button>
            </div>
          ))}
          {!task.documentsRequired ? (
            <button
              type="button"
              className={styles.inlineMenuAction}
              disabled={saving}
              onClick={() => void saveDocumentsRequired(true)}
            >
              {wf.documentsMarkRequired}
            </button>
          ) : null}
          {task.documentsRequired && taskDocuments.length === 0 ? (
            <button
              type="button"
              className={styles.inlineMenuAction}
              disabled={saving}
              onClick={() => void saveDocumentsRequired(false)}
            >
              {wf.documentsNotRequired}
            </button>
          ) : null}
        </WorkflowInlineMenu>
      </span>

      <span className={`${styles.inlineCellWrap} ${styles.workflowMetaCell}`} ref={assigneeRef}>
        <button
          type="button"
          className={`${styles.inlineCellBtn} ${styles.assignedCell}`}
          disabled={saving}
          aria-expanded={assigneeMenuOpen}
          onClick={() => {
            setStatusMenuOpen(false);
            setDocumentsMenuOpen(false);
            setAssigneeMenuOpen((open) => !open);
          }}
        >
          {task.assignedTo ? (
            <TeamMemberAvatar member={task.assignedTo} />
          ) : (
            <span
              className={`${shared.avatar} ${shared.avatarUnassigned}`}
              title={wf.unassigned}
              aria-label={wf.unassigned}
            >
              —
            </span>
          )}
        </button>
        <WorkflowInlineMenu
          open={assigneeMenuOpen}
          onClose={() => setAssigneeMenuOpen(false)}
          anchorRef={assigneeRef}
          align="end"
        >
          {assigneeOptions.map((option) => (
            <button
              key={option.id || 'unassigned'}
              type="button"
              className={styles.inlineMenuAction}
              disabled={saving}
              onClick={() => void saveAssignee(option.id)}
            >
              {option.label}
            </button>
          ))}
        </WorkflowInlineMenu>
      </span>

      <span className={`${styles.inlineDueCell} ${styles.workflowMetaCell}`}>
        <button
          type="button"
          className={styles.inlineCellBtn}
          disabled={saving}
          onClick={() => {
            closeMenus();
            dueInputRef.current?.showPicker?.();
            dueInputRef.current?.click();
          }}
        >
          {formatShortDate(task.dueAt)}
        </button>
        <input
          ref={dueInputRef}
          type="date"
          className={styles.inlineDateInput}
          value={dueInputValue}
          disabled={saving}
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void saveDue(e.target.value)}
        />
      </span>

      <span className={styles.taskDeleteCell}>
        <button
          type="button"
          className={styles.taskDeleteBtn}
          disabled={saving || !onRequestArchiveTask}
          title={wf.deleteTask}
          aria-label={wf.deleteTask}
          onClick={() => {
            closeMenus();
            onRequestArchiveTask?.(task);
          }}
        >
          <span aria-hidden>🗑️</span>
        </button>
      </span>
    </div>
  );
}
