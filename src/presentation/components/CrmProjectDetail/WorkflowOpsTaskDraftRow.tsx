'use client';

import type { ReactElement, RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask, PipelineStageSlug, WorkflowTaskStatus } from '@/domain/crm';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import { createCrmWorkflowTask } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatWorkflowStatus } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
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
  /** When set, overrides the viewport breakpoint for card vs table draft layout. */
  useCardLayout?: boolean;
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
}: WorkflowOpsTaskDraftFieldsProps): ReactElement {
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineCellWrap} ${styles.workflowStatusCell}`;

  return (
    <div className={wrapClass} ref={statusRef}>
      <button
        type="button"
        className={styles.inlinePillBtn}
        disabled={saving}
        aria-expanded={statusMenuOpen}
        onClick={() => {
          onAssigneeMenuOpenChange(false);
          onStatusMenuOpenChange(!statusMenuOpen);
        }}
      >
        <span className={`${styles.statusPill} ${statusBadgeClass(form.status)}`}>
          {formatWorkflowStatus(form.status)}
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
            <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
              {formatWorkflowStatus(status)}
            </span>
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
}: WorkflowOpsTaskDraftFieldsProps): ReactElement {
  const wrapClass = mobile
    ? styles.workflowTaskMobileCardControl
    : `${styles.inlineCellWrap} ${styles.workflowMetaCell}`;

  return (
    <div className={wrapClass} ref={assigneeRef}>
      <button
        type="button"
        className={
          mobile
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
}: {
  readonly wf: (typeof content.projectDetail.workflow);
  readonly saving: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly mobile?: boolean;
}): ReactElement {
  const actionClass = mobile
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

export function WorkflowOpsTaskDraftRow({
  project,
  stageSlug,
  isApiSource,
  onSaved,
  onCancel,
  useCardLayout,
}: WorkflowOpsTaskDraftRowProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const cols = wf.columns;
  const isMobileLayout = useDashboardMobileLayout();
  const showCardLayout = useCardLayout ?? isMobileLayout;
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

  const statusRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

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

  if (showCardLayout) {
    return (
      <div className={styles.paymentDraftBlock}>
        <article
          className={`${styles.card} ${styles.workflowTaskMobileCard} ${styles.workflowTaskMobileDraftCard}`}
          aria-busy={saving}
        >
          <div className={styles.workflowTaskMobileCardHeader}>
            <div className={styles.workflowTaskMobileCardTitleWrap}>
              <input
                className={styles.workflowTaskMobileDraftTitleInput}
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
              mobile
              onSave={() => void handleSave()}
              onCancel={onCancel}
            />
          </div>
          <div className={styles.workflowTaskMobileCardGrid2}>
            <div className={styles.workflowTaskMobileCardCell}>
              <span className={styles.projectInfoMobileLabel}>{cols.status}</span>
              <WorkflowOpsTaskDraftStatusField {...fieldProps} mobile />
            </div>
            <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
              <span className={styles.projectInfoMobileLabel}>{cols.assigned}</span>
              <WorkflowOpsTaskDraftAssigneeField {...fieldProps} mobile />
            </div>
          </div>
          <div className={styles.workflowTaskMobileCardGrid2}>
            <div className={styles.workflowTaskMobileCardCell}>
              <span className={styles.projectInfoMobileLabel}>{cols.documents}</span>
              <select
                className={`${styles.paymentDraftSelect} ${styles.workflowTaskMobileDraftField}`}
                value={form.documentsRequired}
                disabled={saving}
                aria-label={wf.fields.documentsRequired}
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
            </div>
            <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
              <span className={styles.projectInfoMobileLabel}>{cols.due}</span>
              <input
                type="date"
                className={`${styles.paymentDraftDateInput} ${styles.workflowTaskMobileDraftField}`}
                value={form.dueAt}
                disabled={saving}
                aria-label={wf.fields.due}
                onChange={(e) => updateField('dueAt', e.target.value)}
              />
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
        <WorkflowOpsTaskDraftStatusField {...fieldProps} />
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
