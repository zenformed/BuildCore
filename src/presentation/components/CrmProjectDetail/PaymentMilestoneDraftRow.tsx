'use client';

import type { ReactElement } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { WORKFLOW_TASK_STATUSES } from '@/domain/crm/workflowTaskStatuses';
import type { WorkflowTaskStatus } from '@/domain/crm';
import { createCrmWorkflowTask } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatWorkflowStatus } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  defaultPaymentMilestoneFormState,
  validateWorkflowTaskForm,
  type WorkflowTaskFormState,
} from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { normalizeAssigneeMemberIdForSave } from '@/presentation/features/crmAssignment/buildAssigneeOptions';
import { AssigneeMenuOptionLabel } from '@/presentation/features/crmAssignment/AssigneeMenuOptionLabel';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { shouldOfferWorkflowTaskCustomerNotify } from '@/presentation/features/crmProjectDetail/workflowTaskCustomerNotify';
import { crmRepositories } from '@/shared/di/container';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { WorkflowInlineMenu } from './WorkflowInlineMenu';
import styles from './ProjectDetail.module.css';

function statusBadgeClass(status: WorkflowTaskStatus): string {
  return shared[`statusBadge_${status}`] ?? shared.statusBadge_pending;
}

function PaymentMilestoneDraftActions({
  payments,
  saving,
  onSave,
  onCancel,
  mobile = false,
}: {
  readonly payments: (typeof content.projectDetail.payments);
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
        title={payments.saveMilestone}
        aria-label={payments.saveMilestone}
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
        title={payments.cancelMilestone}
        aria-label={payments.cancelMilestone}
        onClick={onCancel}
      >
        <span className={styles.taskOpenIcon} aria-hidden />
      </button>
    </span>
  );
}

export type PaymentMilestoneDraftRowProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  onSaved: (task: CrmWorkflowTask) => Promise<void>;
  onCancel: () => void;
};

export function PaymentMilestoneDraftRow({
  project,
  isApiSource,
  onSaved,
  onCancel,
}: PaymentMilestoneDraftRowProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const payments = content.projectDetail.payments;
  const cols = wf.columns;
  const payCols = payments.columns;
  const isMobileLayout = useDashboardMobileLayout();
  const dash = useBuildCoreDashboardContext();
  const { requestCustomerNotifyAfterAssigneeChange } = useProjectDetailShell();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const [form, setForm] = useState<WorkflowTaskFormState>(defaultPaymentMilestoneFormState);
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
  const selectedAssignee = assigneeOptions.find((o) => o.id === form.assignedMemberId);

  const updateField = useCallback(
    <K extends keyof WorkflowTaskFormState>(key: K, value: WorkflowTaskFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const handleSave = useCallback(async () => {
    const validated = validateWorkflowTaskForm(form, { docCount: 0 });
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
    isApiSource,
    onCancel,
    onSaved,
    project.summary.id,
    project.summary.slug,
    requestCustomerNotifyAfterAssigneeChange,
    wf.taskSubmitFailed,
  ]);

  const rowClass = `${styles.tableRow} ${styles.workflowGrid} ${styles.workflowGridPaymentsWithDates} ${styles.workflowInlineRow} ${styles.paymentDraftRow}`;

  if (isMobileLayout) {
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
            <PaymentMilestoneDraftActions
              payments={payments}
              saving={saving}
              mobile
              onSave={() => void handleSave()}
              onCancel={onCancel}
            />
          </div>
          <div className={styles.workflowTaskMobileCardBody}>
          <div className={styles.workflowTaskMobileCardGrid2}>
            <div className={styles.workflowTaskMobileCardCell}>
              <span className={styles.projectInfoMobileLabel}>{cols.status}</span>
              <div className={styles.workflowTaskMobileCardControl} ref={statusRef}>
                <button
                  type="button"
                  className={styles.inlinePillBtn}
                  disabled={saving}
                  aria-expanded={statusMenuOpen}
                  onClick={() => {
                    setAssigneeMenuOpen(false);
                    setStatusMenuOpen((open) => !open);
                  }}
                >
                  <span className={`${styles.statusPill} ${statusBadgeClass(form.status)}`}>
                    {formatWorkflowStatus(form.status)}
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
                      disabled={saving || status === form.status}
                      onClick={() => {
                        updateField('status', status);
                        setStatusMenuOpen(false);
                      }}
                    >
                      <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
                        {formatWorkflowStatus(status)}
                      </span>
                    </button>
                  ))}
                </WorkflowInlineMenu>
              </div>
            </div>
            <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
              <span className={styles.projectInfoMobileLabel}>{cols.assigned}</span>
              <div className={styles.workflowTaskMobileCardControl} ref={assigneeRef}>
                <button
                  type="button"
                  className={`${styles.workflowTaskMobileCardValueBtn} ${styles.assignedCell}`}
                  disabled={saving}
                  aria-expanded={assigneeMenuOpen}
                  onClick={() => {
                    setStatusMenuOpen(false);
                    setAssigneeMenuOpen((open) => !open);
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
                  onClose={() => setAssigneeMenuOpen(false)}
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
                        setAssigneeMenuOpen(false);
                      }}
                    >
                      <AssigneeMenuOptionLabel option={option} />
                    </button>
                  ))}
                </WorkflowInlineMenu>
              </div>
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
              <span className={styles.projectInfoMobileLabel}>{cols.amount}</span>
              <input
                className={`${styles.inlineFieldInput} ${styles.workflowTaskMobileDraftField}`}
                value={form.amountUsd}
                disabled={saving}
                inputMode="decimal"
                placeholder="0.00"
                aria-label={cols.amount}
                onChange={(e) => updateField('amountUsd', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                  if (e.key === 'Escape') onCancel();
                }}
              />
            </div>
          </div>
          <div className={styles.workflowTaskMobileCardGrid3}>
            <div className={styles.workflowTaskMobileCardCell}>
              <span className={styles.projectInfoMobileLabel}>{cols.due}</span>
              <input
                type="date"
                className={`${styles.paymentDraftDateInput} ${styles.workflowTaskMobileDraftField}`}
                value={form.dueAt}
                disabled={saving}
                aria-label={cols.due}
                onChange={(e) => updateField('dueAt', e.target.value)}
              />
            </div>
            <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_center}`}>
              <span className={styles.projectInfoMobileLabel}>{payCols.invoiced}</span>
              <input
                type="date"
                className={`${styles.paymentDraftDateInput} ${styles.workflowTaskMobileDraftField}`}
                value={form.invoicedAt}
                disabled={saving}
                aria-label={payCols.invoiced}
                onChange={(e) => updateField('invoicedAt', e.target.value)}
              />
            </div>
            <div className={`${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`}>
              <span className={styles.projectInfoMobileLabel}>{payCols.paid}</span>
              <input
                type="date"
                className={`${styles.paymentDraftDateInput} ${styles.workflowTaskMobileDraftField}`}
                value={form.paidAt}
                disabled={saving}
                aria-label={payCols.paid}
                onChange={(e) => updateField('paidAt', e.target.value)}
              />
            </div>
          </div>
          </div>
        </article>
        {error ? <p className={styles.paymentDraftError}>{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.paymentDraftBlock}>
      <div className={rowClass} role="row" aria-busy={saving}>
        <span className={`${styles.inlineCellWrap} ${styles.workflowStatusCell}`} ref={statusRef}>
          <button
            type="button"
            className={styles.inlinePillBtn}
            disabled={saving}
            aria-expanded={statusMenuOpen}
            onClick={() => {
              setAssigneeMenuOpen(false);
              setStatusMenuOpen((open) => !open);
            }}
          >
            <span className={`${styles.statusPill} ${statusBadgeClass(form.status)}`}>
              {formatWorkflowStatus(form.status)}
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
                disabled={saving || status === form.status}
                onClick={() => {
                  updateField('status', status);
                  setStatusMenuOpen(false);
                }}
              >
                <span className={`${styles.statusPill} ${statusBadgeClass(status)}`}>
                  {formatWorkflowStatus(status)}
                </span>
              </button>
            ))}
          </WorkflowInlineMenu>
        </span>

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

        <span className={`${styles.inlineAmountCell} ${styles.workflowMetaCell}`}>
          <input
            className={styles.inlineFieldInput}
            value={form.amountUsd}
            disabled={saving}
            inputMode="decimal"
            placeholder="0.00"
            onChange={(e) => updateField('amountUsd', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
              if (e.key === 'Escape') onCancel();
            }}
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
              updateField('documentsRequired', e.target.value as WorkflowTaskFormState['documentsRequired'])
            }
          >
            <option value="yes">{wf.fields.documentsRequiredYes}</option>
            <option value="no">{wf.fields.documentsRequiredNo}</option>
          </select>
        </span>

        <span className={`${styles.inlineCellWrap} ${styles.workflowMetaCell}`} ref={assigneeRef}>
          <button
            type="button"
            className={`${styles.inlineCellBtn} ${styles.assignedCell}`}
            disabled={saving}
            aria-expanded={assigneeMenuOpen}
            onClick={() => {
              setStatusMenuOpen(false);
              setAssigneeMenuOpen((open) => !open);
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
            onClose={() => setAssigneeMenuOpen(false)}
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
                  setAssigneeMenuOpen(false);
                }}
              >
                <AssigneeMenuOptionLabel option={option} />
              </button>
            ))}
          </WorkflowInlineMenu>
        </span>

        <span className={`${styles.inlineDueCell} ${styles.workflowMetaCell}`}>
          <input
            type="date"
            className={styles.paymentDraftDateInput}
            value={form.dueAt}
            disabled={saving}
            onChange={(e) => updateField('dueAt', e.target.value)}
          />
        </span>

        <span className={`${styles.inlineDueCell} ${styles.workflowMetaCell}`}>
          <input
            type="date"
            className={styles.paymentDraftDateInput}
            value={form.invoicedAt}
            disabled={saving}
            aria-label={payments.columns.invoiced}
            onChange={(e) => updateField('invoicedAt', e.target.value)}
          />
        </span>

        <span className={`${styles.inlineDueCell} ${styles.workflowMetaCell}`}>
          <input
            type="date"
            className={styles.paymentDraftDateInput}
            value={form.paidAt}
            disabled={saving}
            aria-label={payments.columns.paid}
            onChange={(e) => updateField('paidAt', e.target.value)}
          />
        </span>

        <PaymentMilestoneDraftActions
          payments={payments}
          saving={saving}
          onSave={() => void handleSave()}
          onCancel={onCancel}
        />
      </div>
      {error ? <p className={styles.paymentDraftError}>{error}</p> : null}
    </div>
  );
}
