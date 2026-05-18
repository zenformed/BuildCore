'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrmWorkflowTask, WorkflowTaskStatus } from '@/domain/crm';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { useWorkflowTaskPatch } from '@/presentation/features/crmProjectDetail/useWorkflowTaskPatch';
import {
  dueInputValueToIso,
  workflowTaskDueToInputValue,
} from '@/presentation/features/crmProjectDetail/workflowTaskInlineUtils';
import { useAuth } from '@/presentation/hooks/useAuth';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

export type WorkflowTaskInlineRowProps = {
  task: CrmWorkflowTask;
  docCount: number;
  isApiSource: boolean;
  onUpdated: () => Promise<void>;
  onUploadComingSoon?: () => void;
  onTaskError?: (message: string) => void;
};

export function WorkflowTaskInlineRow({
  task,
  docCount,
  isApiSource,
  onUpdated,
  onUploadComingSoon,
  onTaskError,
}: WorkflowTaskInlineRowProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const { user } = useAuth();
  const { saving, patchTask } = useWorkflowTaskPatch(onUpdated);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const dueInputRef = useRef<HTMLInputElement>(null);

  const assigneeOptions = getWorkflowTaskAssigneeOptions(isApiSource, user?.id);
  const dueInputValue = workflowTaskDueToInputValue(task.dueAt);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(task.title);
  }, [editingTitle, task.title]);

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
      try {
        await patchTask({ taskId: task.id, status });
      } catch (err) {
        reportError(err);
      }
    },
    [patchTask, reportError, task.id, task.status]
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

  const rowClass = `${styles.tableRow} ${styles.workflowGrid} ${styles.workflowInlineRow}`;

  const documentsLabel = !task.documentsRequired
    ? wf.documentsNotRequired
    : docCount === 0
      ? wf.documentsNone
      : `${docCount} ${wf.documentsCountSuffix}`;

  return (
    <div className={rowClass} role="row" aria-busy={saving}>
      <span className={styles.taskTitleCell}>
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
            onClick={() => {
              closeMenus();
              setTitleDraft(task.title);
              setEditingTitle(true);
            }}
          >
            {task.title}
          </button>
        )}
      </span>

      <span className={styles.inlineCellWrap} ref={statusRef}>
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
              disabled={saving || status === task.status}
              onClick={() => void saveStatus(status)}
            >
              <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
                {formatWorkflowStatus(status)}
              </span>
            </button>
          ))}
        </WorkflowInlineMenu>
      </span>

      <span className={styles.inlineCellWrap} ref={documentsRef}>
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
          {!task.documentsRequired ? null : <span className={styles.documentsIcon} aria-hidden />}
          <span className={!task.documentsRequired ? styles.documentsNotRequired : undefined}>
            {documentsLabel}
          </span>
        </button>
        <WorkflowInlineMenu
          open={documentsMenuOpen}
          onClose={() => setDocumentsMenuOpen(false)}
          anchorRef={documentsRef}
        >
          <button
            type="button"
            className={styles.inlineMenuAction}
            disabled={saving}
            onClick={() => {
              setDocumentsMenuOpen(false);
              onUploadComingSoon?.();
            }}
          >
            {wf.documentsUpload}
          </button>
          <button
            type="button"
            className={styles.inlineMenuAction}
            disabled={saving}
            onClick={() => void saveDocumentsRequired(false)}
          >
            {wf.documentsNotRequired}
          </button>
        </WorkflowInlineMenu>
      </span>

      <span className={styles.inlineCellWrap} ref={assigneeRef}>
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

      <span className={styles.inlineDueCell}>
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

      <span className={styles.taskCompletionCell}>
        {task.status === 'done' ? (
          <span className={styles.taskDoneIcon} title={wf.taskDoneIndicator} aria-label={wf.taskDoneIndicator}>
            ✓
          </span>
        ) : (
          <span className={styles.taskOpenIcon} title={wf.taskOpenIndicator} aria-label={wf.taskOpenIndicator} />
        )}
      </span>
    </div>
  );
}
