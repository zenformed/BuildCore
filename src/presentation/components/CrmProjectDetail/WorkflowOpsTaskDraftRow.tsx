'use client';

import type { ReactElement, RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask, PipelineStageSlug, WorkflowTaskStatus } from '@/domain/crm';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { createCrmWorkflowTask } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatShortDate,
  formatWorkflowStatus,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import {
  defaultWorkflowTaskFormState,
  validateWorkflowTaskForm,
  type WorkflowTaskFormState,
} from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { shouldOfferWorkflowTaskCustomerNotify } from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';
import { crmRepositories } from '@/shared/di/container';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import {
  WORKFLOW_TASK_DOCUMENTS_FIELD_KEY,
  WORKFLOW_TASK_DUE_FIELD_KEY,
} from '@/domain/buildcore/fieldLabels';
import { useBuildCoreFieldLabels } from '@/presentation/providers/BuildCoreFieldLabelsProvider';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

export type WorkflowOpsTaskDraftRowProps = {
  project: CrmProjectDetail;
  stageSlug: PipelineStageSlug;
  isApiSource: boolean;
  onSaved: (task: CrmWorkflowTask) => Promise<void>;
  onCancel: () => void;
  /** Mobile card draft layout (< 768px). */
  useCardLayout?: boolean;
  /** Desktop stage-column compact card draft layout. */
  useCompactLayout?: boolean;
};

type WorkflowOpsTaskDraftFieldsProps = {
  readonly wf: (typeof content.projectDetail.workflow);
  readonly cols: (typeof content.projectDetail.workflow.columns);
  readonly form: WorkflowTaskFormState;
  readonly saving: boolean;
  readonly statusMenuOpen: boolean;
  readonly assigneeMenuOpen: boolean;
  readonly statusRef: RefObject<HTMLDivElement>;
  readonly assigneeRef: RefObject<HTMLDivElement>;
  readonly assigneeOptions: ReturnType<typeof getWorkflowTaskAssigneeOptions>;
  readonly selectedAssignee: ReturnType<typeof getWorkflowTaskAssigneeOptions>[number] | undefined;
  readonly onStatusMenuOpenChange: (open: boolean) => void;
  readonly onAssigneeMenuOpenChange: (open: boolean) => void;
  readonly updateField: <K extends keyof WorkflowTaskFormState>(
    key: K,
    value: WorkflowTaskFormState[K]
  ) => void;
  readonly mobile?: boolean;
  readonly compact?: boolean;
};

function WorkflowOpsTaskDraftStatusField({
  form,
  saving,
  statusMenuOpen,
  statusRef,
  onStatusMenuOpenChange,
  onAssigneeMenuOpenChange,
  updateField,
  mobile = false,
  compact = false,
  layout = 'combined',
}: WorkflowOpsTaskDraftFieldsProps & {
  readonly layout?: 'combined' | 'dot';
}): ReactElement {
  const wrapClass =
    layout === 'dot'
      ? styles.workflowPrimaryStatusLead
      : compact
        ? styles.workflowTaskCompactControl
        : mobile
          ? styles.workflowTaskMobileCardControl
          : `${styles.inlineCellWrap} ${styles.workflowStatusCell}`;
  const useDotStatus = !mobile;
  const openMenu = () => {
    onAssigneeMenuOpenChange(false);
    onStatusMenuOpenChange(!statusMenuOpen);
  };

  if (layout === 'dot') {
    return (
      <div className={wrapClass} ref={statusRef}>
        <button
          type="button"
          className={styles.workflowStatusIconBtn}
          disabled={saving}
          aria-expanded={statusMenuOpen}
          aria-label={formatWorkflowStatus(form.status)}
          onClick={openMenu}
        >
          <span className={`${styles.statusDotIndicator} ${statusBadgeClass(form.status)}`}>
            <span className={styles.statusDot} aria-hidden />
          </span>
        </button>
        <WorkflowInlineMenu
          open={statusMenuOpen}
          onClose={() => onStatusMenuOpenChange(false)}
          anchorRef={statusRef}
        >
          {WORKFLOW_TASK_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={styles.inlineMenuPillOption}
              disabled={saving || status === form.status}
              onClick={() => {
                updateField('status', status);
                onStatusMenuOpenChange(false);
              }}
            >
              <span className={`${styles.statusDotIndicator} ${statusBadgeClass(status)}`}>
                <span className={styles.statusDot} aria-hidden />
                <span className={styles.statusDotText}>{formatWorkflowStatus(status)}</span>
              </span>
            </button>
          ))}
        </WorkflowInlineMenu>
      </div>
    );
  }

  return (
    <div className={wrapClass} ref={statusRef}>
      <button
        type="button"
        className={styles.inlinePillBtn}
        disabled={saving}
        aria-expanded={statusMenuOpen}
        onClick={openMenu}
      >
        {useDotStatus ? (
          <span className={`${styles.statusDotIndicator} ${statusBadgeClass(form.status)}`}>
            <span className={styles.statusDot} aria-hidden />
            <span className={styles.statusDotText}>{formatWorkflowStatus(form.status)}</span>
          </span>
        ) : (
          <span className={`${styles.statusPill} ${statusBadgeClass(form.status)}`}>
            {formatWorkflowStatus(form.status)}
          </span>
        )}
      </button>
      <WorkflowInlineMenu
        open={statusMenuOpen}
        onClose={() => onStatusMenuOpenChange(false)}
        anchorRef={statusRef}
      >
        {WORKFLOW_TASK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={styles.inlineMenuPillOption}
            disabled={saving || status === form.status}
            onClick={() => {
              updateField('status', status);
              onStatusMenuOpenChange(false);
            }}
          >
            {useDotStatus ? (
              <span className={`${styles.statusDotIndicator} ${statusBadgeClass(status)}`}>
                <span className={styles.statusDot} aria-hidden />
                <span className={styles.statusDotText}>{formatWorkflowStatus(status)}</span>
              </span>
            ) : (
              <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
                {formatWorkflowStatus(status)}
              </span>
            )}
          </button>
        ))}
      </WorkflowInlineMenu>
    </div>
  );
}

function WorkflowOpsTaskDraftAssigneeField({
  wf,
  saving,
  assigneeMenuOpen,
  assigneeRef,
  assigneeOptions,
  selectedAssignee,
  onStatusMenuOpenChange,
  onAssigneeMenuOpenChange,
  updateField,
  mobile = false,
  compact = false,
}: WorkflowOpsTaskDraftFieldsProps): ReactElement {
  const wrapClass = compact
    ? styles.workflowTaskCompactAssignee
    : mobile
      ? styles.workflowTaskMobileCardControl
      : `${styles.inlineCellWrap} ${styles.workflowMetaCell}`;

  return (
    <div className={wrapClass} ref={assigneeRef}>
      <button
        type="button"
        className={
          compact
            ? styles.workflowTaskCompactAssigneeBtn
            : mobile
              ? `${styles.workflowTaskMobileCardValueBtn} ${styles.assignedCell}`
              : `${styles.inlineCellBtn} ${styles.assignedCell}`
        }
        disabled={saving}
        aria-expanded={assigneeMenuOpen}
        onClick={() => {
          onStatusMenuOpenChange(false);
          onAssigneeMenuOpenChange(!assigneeMenuOpen);
        }}
      >
        {selectedAssignee?.member ? (
          <TeamMemberAvatar member={selectedAssignee.member} />
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
        onClose={() => onAssigneeMenuOpenChange(false)}
        anchorRef={assigneeRef}
        align="end"
      >
        {assigneeOptions.map((option) => (
          <button
            key={option.id || 'unassigned'}
            type="button"
            className={`${styles.inlineMenuAction} ${shared.assigneeMenuAction}`}
            disabled={saving || option.disabled === true}
            onClick={() => {
              if (option.disabled) return;
              updateField('assignedMemberId', option.id);
              onAssigneeMenuOpenChange(false);
            }}
          >
            <AssigneeMenuOptionLabel option={option} />
          </button>
        ))}
      </WorkflowInlineMenu>
    </div>
  );
}

function WorkflowOpsTaskDraftActions({
  wf,
  saving,
  onSave,
  onCancel,
  mobile = false,
  compact = false,
}: {
  readonly wf: (typeof content.projectDetail.workflow);
  readonly saving: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly mobile?: boolean;
  readonly compact?: boolean;
}): ReactElement {
  const actionClass = compact
    ? styles.workflowTaskCompactDraftActions
    : mobile
      ? styles.workflowTaskMobileDraftActions
      : `${styles.taskDeleteCell} ${styles.paymentDraftActions}`;

  return (
    <span className={actionClass}>
      <button
        type="button"
        className={styles.paymentDraftActionBtn}
        disabled={saving}
        title={wf.saveTask}
        aria-label={wf.saveTask}
        onClick={onSave}
      >
        <span className={styles.taskDoneIcon} aria-hidden>
          ✓
        </span>
      </button>
      <button
        type="button"
        className={styles.paymentDraftActionBtn}
        disabled={saving}
        title={wf.cancelTask}
        aria-label={wf.cancelTask}
        onClick={onCancel}
      >
        <span className={styles.taskOpenIcon} aria-hidden />
      </button>
    </span>
  );
}

function WorkflowOpsTaskDraftCompactDueField({
  wf,
  form,
  saving,
  updateField,
  onCloseMenus,
}: {
  readonly wf: (typeof content.projectDetail.workflow);
  readonly form: WorkflowTaskFormState;
  readonly saving: boolean;
  readonly updateField: WorkflowOpsTaskDraftFieldsProps['updateField'];
  readonly onCloseMenus: () => void;
}): ReactElement {
  const dueInputRef = useRef<HTMLInputElement>(null);
  const dueDisplay = form.dueAt.trim()
    ? formatShortDate(`${form.dueAt.trim()}T12:00:00.000Z`)
    : '';
  const { getFieldLabel } = useBuildCoreFieldLabels();

  return (
    <span className={styles.workflowTaskCompactControl}>
      <button
        type="button"
        className={`${styles.inlineCellBtn} ${styles.workflowTaskCompactMetaBtn} ${styles.workflowTaskCompactDueBtn}`}
        disabled={saving}
        aria-label={getFieldLabel(WORKFLOW_TASK_DUE_FIELD_KEY)}
        onClick={() => {
          onCloseMenus();
          dueInputRef.current?.showPicker?.();
          dueInputRef.current?.click();
        }}
      >
        <span className={styles.workflowTaskCompactDueContent}>
          <span className={styles.dueIcon} aria-hidden />
          {dueDisplay ? (
            <span className={styles.workflowTaskCompactMeta}>{dueDisplay}</span>
          ) : null}
        </span>
      </button>
      <input
        ref={dueInputRef}
        type="date"
        className={styles.inlineDateInput}
        value={form.dueAt}
        disabled={saving}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => updateField('dueAt', e.target.value)}
      />
    </span>
  );
}

function WorkflowOpsTaskDraftCompactDocumentsField({
  wf,
  form,
  saving,
  documentsMenuOpen,
  documentsRef,
  onDocumentsMenuOpenChange,
  onCloseMenus,
  updateField,
}: {
  readonly wf: (typeof content.projectDetail.workflow);
  readonly form: WorkflowTaskFormState;
  readonly saving: boolean;
  readonly documentsMenuOpen: boolean;
  readonly documentsRef: RefObject<HTMLSpanElement>;
  readonly onDocumentsMenuOpenChange: (open: boolean) => void;
  readonly onCloseMenus: () => void;
  readonly updateField: WorkflowOpsTaskDraftFieldsProps['updateField'];
}): ReactElement {
  const { getFieldLabel } = useBuildCoreFieldLabels();

  return (
    <span className={styles.workflowTaskCompactControl} ref={documentsRef}>
      <button
        type="button"
        className={`${styles.inlineCellBtn} ${styles.documentsCell} ${styles.workflowTaskCompactMetaBtn}`}
        disabled={saving}
        aria-expanded={documentsMenuOpen}
        aria-label={getFieldLabel(WORKFLOW_TASK_DOCUMENTS_FIELD_KEY)}
        onClick={() => {
          onCloseMenus();
          onDocumentsMenuOpenChange(!documentsMenuOpen);
        }}
      >
        <span className={styles.documentsIcon} aria-hidden />
      </button>
      <WorkflowInlineMenu
        open={documentsMenuOpen}
        onClose={() => onDocumentsMenuOpenChange(false)}
        anchorRef={documentsRef}
        align="end"
      >
        <button
          type="button"
          className={styles.inlineMenuAction}
          disabled={saving || form.documentsRequired === 'yes'}
          onClick={() => {
            updateField('documentsRequired', 'yes');
            onDocumentsMenuOpenChange(false);
          }}
        >
          {wf.fields.documentsRequiredYes}
        </button>
        <button
          type="button"
          className={styles.inlineMenuAction}
          disabled={saving || form.documentsRequired === 'no'}
          onClick={() => {
            updateField('documentsRequired', 'no');
            onDocumentsMenuOpenChange(false);
          }}
        >
          {wf.fields.documentsRequiredNo}
        </button>
      </WorkflowInlineMenu>
    </span>
  );
}

function WorkflowOpsTaskDraftCompactMenuPlaceholder({
  wf,
  saving,
}: {
  readonly wf: (typeof content.projectDetail.workflow);
  readonly saving: boolean;
}): ReactElement {
  return (
    <div className={styles.workflowTaskCompactActions}>
      <button
        type="button"
        className={styles.taskActionsBtn}
        disabled={saving}
        aria-label={wf.taskActionsMenuAriaLabel(wf.fields.title)}
        tabIndex={-1}
      >
        <span className={styles.taskActionsDots} aria-hidden>
          ⋮
        </span>
      </button>
    </div>
  );
}

export function WorkflowOpsTaskDraftRow({
  project,
  stageSlug,
  isApiSource,
  onSaved,
  onCancel,
  useCardLayout,
  useCompactLayout = false,
}: WorkflowOpsTaskDraftRowProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const cols = wf.columns;
  const isMobileLayout = useDashboardMobileLayout();
  const showCompactLayout = useCompactLayout || (useCardLayout ?? isMobileLayout);
  const dash = useBuildCoreDashboardContext();
  const { requestCustomerNotifyAfterAssigneeChange } = useProjectDetailShell();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const [form, setForm] = useState<WorkflowTaskFormState>(() =>
    defaultWorkflowTaskFormState(stageSlug)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HTMLSpanElement>(null);

  const closeMenus = useCallback(() => {
    setStatusMenuOpen(false);
    setAssigneeMenuOpen(false);
    setDocumentsMenuOpen(false);
  }, []);

  const assigneeOptions = getWorkflowTaskAssigneeOptions(
    isApiSource,
    assignmentCatalog,
    project.summary.contact,
    dash.user?.id,
    form.assignedMemberId
  );
  const selectedAssignee = assigneeOptions.find((option) => option.id === form.assignedMemberId);

  const updateField = useCallback(
    <K extends keyof WorkflowTaskFormState>(key: K, value: WorkflowTaskFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const handleSave = useCallback(async () => {
    const validated = validateWorkflowTaskForm({ ...form, stageSlug }, { docCount: 0 });
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createCrmWorkflowTask(crmRepositories, {
        projectId: project.summary.id,
        projectSlug: project.summary.slug,
        ...validated.body,
      });
      await onSaved(created);
      if (
        shouldOfferWorkflowTaskCustomerNotify({
          isApiSource,
          previousAssigneeId: '',
          newAssigneeId: form.assignedMemberId,
        })
      ) {
        requestCustomerNotifyAfterAssigneeChange(
          isApiSource,
          created.id,
          '',
          form.assignedMemberId
        );
      }
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : wf.taskSubmitFailed);
    } finally {
      setSaving(false);
    }
  }, [
    form,
    onCancel,
    onSaved,
    project.summary.id,
    project.summary.slug,
    stageSlug,
    wf.taskSubmitFailed,
    isApiSource,
    requestCustomerNotifyAfterAssigneeChange,
  ]);

  const fieldProps: WorkflowOpsTaskDraftFieldsProps = {
    wf,
    cols,
    form,
    saving,
    statusMenuOpen,
    assigneeMenuOpen,
    statusRef,
    assigneeRef,
    assigneeOptions,
    selectedAssignee,
    onStatusMenuOpenChange: setStatusMenuOpen,
    onAssigneeMenuOpenChange: setAssigneeMenuOpen,
    updateField,
  };

  const rowSelection = useWorkflowTaskRowSelection();
  const showRowSelect = rowSelection != null;

  if (showCompactLayout) {
    return (
      <div className={styles.paymentDraftBlock}>
        <article
          className={`${styles.card} ${styles.workflowTaskCompactCard} ${styles.workflowTaskCompactDraftCard}`}
          aria-busy={saving}
        >
          <div className={styles.workflowTaskCompactRow1}>
            <div className={styles.workflowTaskCompactTitleWrap}>
              <input
                className={styles.workflowTaskCompactDraftTitleInput}
                value={form.title}
                disabled={saving}
                placeholder={wf.fields.title}
                aria-label={wf.fields.title}
                onChange={(e) => updateField('title', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                  if (e.key === 'Escape') onCancel();
                }}
                autoFocus
              />
            </div>
            <WorkflowOpsTaskDraftActions
              wf={wf}
              saving={saving}
              compact
              onSave={() => void handleSave()}
              onCancel={onCancel}
            />
            <WorkflowOpsTaskDraftCompactMenuPlaceholder wf={wf} saving={saving} />
          </div>
          <div className={styles.workflowTaskCompactRow2}>
            <WorkflowOpsTaskDraftStatusField {...fieldProps} compact />
            <span className={styles.workflowTaskCompactRow2Spacer} aria-hidden />
            <div className={styles.workflowTaskCompactRow2End}>
              <WorkflowOpsTaskDraftCompactDueField
                wf={wf}
                form={form}
                saving={saving}
                updateField={updateField}
                onCloseMenus={closeMenus}
              />
              <WorkflowOpsTaskDraftCompactDocumentsField
                wf={wf}
                form={form}
                saving={saving}
                documentsMenuOpen={documentsMenuOpen}
                documentsRef={documentsRef}
                onDocumentsMenuOpenChange={setDocumentsMenuOpen}
                onCloseMenus={closeMenus}
                updateField={updateField}
              />
              <WorkflowOpsTaskDraftAssigneeField {...fieldProps} compact />
            </div>
          </div>
        </article>
        {error ? <p className={styles.paymentDraftError}>{error}</p> : null}
      </div>
    );
  }

  const rowClass = `${styles.tableRow} ${styles.workflowGrid} ${styles.workflowInlineRow} ${styles.paymentDraftRow}`;

  return (
    <div className={styles.paymentDraftBlock}>
      <div className={rowClass} role="row" aria-busy={saving}>
        {showRowSelect ? (
          <span className={styles.workflowSelectCell} aria-hidden />
        ) : null}
        <span className={styles.workflowPrimaryCell}>
          <WorkflowOpsTaskDraftStatusField {...fieldProps} layout="dot" />
          <span className={styles.taskTitleCell}>
            <input
              className={styles.inlineFieldInput}
              value={form.title}
              disabled={saving}
              placeholder={wf.fields.title}
              onChange={(e) => updateField('title', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave();
                if (e.key === 'Escape') onCancel();
              }}
              autoFocus
            />
          </span>
        </span>
        <span className={`${styles.workflowNotesCell} ${styles.workflowMetaCell}`} aria-hidden>
          <span className={styles.workflowNotesPreview}>—</span>
        </span>
        <span className={`${styles.inlineCellWrap} ${styles.workflowMetaCell}`}>
          <select
            className={styles.paymentDraftSelect}
            value={form.documentsRequired}
            disabled={saving}
            onChange={(e) =>
              updateField(
                'documentsRequired',
                e.target.value as WorkflowTaskFormState['documentsRequired']
              )
            }
          >
            <option value="yes">{wf.fields.documentsRequiredYes}</option>
            <option value="no">{wf.fields.documentsRequiredNo}</option>
          </select>
        </span>
        <WorkflowOpsTaskDraftAssigneeField {...fieldProps} />
        <span className={`${styles.inlineDueCell} ${styles.workflowMetaCell}`}>
          <input
            type="date"
            className={styles.paymentDraftDateInput}
            value={form.dueAt}
            disabled={saving}
            onChange={(e) => updateField('dueAt', e.target.value)}
          />
        </span>
        <WorkflowOpsTaskDraftActions
          wf={wf}
          saving={saving}
          onSave={() => void handleSave()}
          onCancel={onCancel}
        />
      </div>
      {error ? <p className={styles.paymentDraftError}>{error}</p> : null}
    </div>
  );
}
