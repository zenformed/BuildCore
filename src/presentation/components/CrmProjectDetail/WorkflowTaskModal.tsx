'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmProjectDetail,
  type CrmWorkflowTask,
  type PipelineStageSlug,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import { createCrmWorkflowTask, updateCrmWorkflowTask } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { formatWorkflowStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { resolveOpsPipelineStages } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import {
  defaultWorkflowTaskFormState,
  formToUpdateInput,
  validateWorkflowTaskForm,
  workflowTaskToFormState,
  type WorkflowTaskFormState,
} from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import { canMarkWorkflowTaskDone } from '@/presentation/features/crmProjectDetail/workflowTaskDocumentsValidation';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { crmRepositories } from '@/shared/di/container';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';
import { CreateFormAssigneePicker } from '@/presentation/components/crmShared/CreateFormAssigneePicker';
import { WorkflowStatusPillPicker } from './WorkflowStatusPillPicker';
import { AddWorkflowTaskCustomFieldDialog } from './AddWorkflowTaskCustomFieldDialog';
import {
  WorkflowTaskCustomFieldsSection,
  buildWorkflowTaskCustomFieldDraftFromTask,
  buildWorkflowTaskCustomFieldValuesPayload,
} from './WorkflowTaskCustomFieldsSection';
import { resolveWorkflowTaskCustomFieldScopeFromModalContext } from '@/domain/buildcore/workflowTaskCustomFields';
import { useBuildCoreWorkflowTaskCustomFieldsForScope } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import styles from './WorkflowTaskModal.module.css';

export type WorkflowTaskModalContext = 'workflow' | 'payment';

export type WorkflowTaskModalProps = {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly modalContext: WorkflowTaskModalContext;
  readonly defaultStageSlug?: PipelineStageSlug | null;
  readonly project: CrmProjectDetail;
  readonly task: CrmWorkflowTask | null;
  readonly isApiSource: boolean;
  readonly onClose: () => void;
  readonly onCreated?: (task: CrmWorkflowTask) => void | Promise<void>;
  readonly onUpdated?: (task: CrmWorkflowTask) => void | Promise<void>;
};

type WorkflowTaskModalSnapshot = {
  readonly form: WorkflowTaskFormState;
  readonly customFields: Record<string, string>;
};

function defaultFormForContext(
  modalContext: WorkflowTaskModalContext,
  stageSlug: PipelineStageSlug,
  task: CrmWorkflowTask | null,
  mode: 'create' | 'edit'
): WorkflowTaskFormState {
  if (mode === 'edit' && task) return workflowTaskToFormState(task);
  const base = defaultWorkflowTaskFormState(stageSlug);
  if (modalContext === 'payment') {
    return { ...base, taskKind: 'payment', stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG };
  }
  return { ...base, taskKind: 'standard', stageSlug };
}

function buildSnapshot(form: WorkflowTaskFormState, customFields: Record<string, string>): string {
  return JSON.stringify({ form, customFields } satisfies WorkflowTaskModalSnapshot);
}

export function WorkflowTaskModal({
  open,
  mode,
  modalContext,
  defaultStageSlug = null,
  project,
  task,
  isApiSource,
  onClose,
  onCreated,
  onUpdated,
}: WorkflowTaskModalProps): ReactElement | null {
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const dash = useBuildCoreDashboardContext();
  const { catalogForProject } = useBuildCorePipelineStages();
  const customFieldScope = resolveWorkflowTaskCustomFieldScopeFromModalContext(modalContext);
  const { activeDefinitions, createDefinition, isSaving: isSavingCustomFieldDefinition } =
    useBuildCoreWorkflowTaskCustomFieldsForScope(customFieldScope);
  const customFieldCopy =
    modalContext === 'payment'
      ? content.projectDetail.payments.customFields
      : content.projectDetail.workflow.customFields;
  const catalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const opsStages = useMemo(() => resolveOpsPipelineStages(catalog), [catalog]);
  const wf = content.projectDetail.workflow;
  const payments = content.projectDetail.payments;
  const resolvedStageSlug = defaultStageSlug ?? project.summary.currentStageSlug;

  const [form, setForm] = useState<WorkflowTaskFormState>(() =>
    defaultFormForContext(modalContext, resolvedStageSlug, task, mode)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customFieldDraft, setCustomFieldDraft] = useState<Record<string, string>>({});
  const [addCustomFieldOpen, setAddCustomFieldOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const taskId = task?.id ?? null;

  useEffect(() => {
    if (!open) return;
    const nextForm = defaultFormForContext(modalContext, resolvedStageSlug, task, mode);
    const nextCustomFields = buildWorkflowTaskCustomFieldDraftFromTask(
      activeDefinitions,
      task?.customFields
    );
    setForm(nextForm);
    setCustomFieldDraft(nextCustomFields);
    setInitialSnapshot(buildSnapshot(nextForm, nextCustomFields));
    setError(null);
    setSaving(false);
    setAddCustomFieldOpen(false);
    setDiscardConfirmOpen(false);
  }, [mode, modalContext, open, resolvedStageSlug, taskId]);

  useEffect(() => {
    if (!open) return;
    setCustomFieldDraft((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const definition of activeDefinitions) {
        if (!(definition.fieldKey in next)) {
          next[definition.fieldKey] = task?.customFields?.[definition.fieldKey] ?? '';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeDefinitions, open, task?.customFields]);

  const isDirty = useMemo(
    () => buildSnapshot(form, customFieldDraft) !== initialSnapshot,
    [customFieldDraft, form, initialSnapshot]
  );

  const updateField = useCallback(
    <K extends keyof WorkflowTaskFormState>(key: K, value: WorkflowTaskFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const docCounts = countDocumentsByTaskId(project.documents);
  const editDocCount = task ? (docCounts.get(task.id) ?? 0) : 0;

  const handleRequestClose = useCallback(() => {
    if (saving || isSavingCustomFieldDefinition) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [isDirty, isSavingCustomFieldDefinition, onClose, saving]);

  useEffect(() => {
    if (!open || addCustomFieldOpen || discardConfirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleRequestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [addCustomFieldOpen, discardConfirmOpen, handleRequestClose, open]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      const validated = validateWorkflowTaskForm(form, { docCount: editDocCount });
      if (!validated.ok) {
        setError(validated.message);
        return;
      }
      setSaving(true);
      try {
        const customFieldValues = buildWorkflowTaskCustomFieldValuesPayload(
          activeDefinitions,
          customFieldDraft
        );
        if (mode === 'create') {
          const created = await createCrmWorkflowTask(crmRepositories, {
            projectId: project.summary.id,
            projectSlug: project.summary.slug,
            ...validated.body,
            customFieldValues,
          });
          onClose();
          await onCreated?.(created);
        } else if (task) {
          const updated = await updateCrmWorkflowTask(crmRepositories, {
            ...formToUpdateInput(task.id, form, { docCount: editDocCount }),
            customFieldValues,
          });
          if (updated == null) {
            setError(wf.taskSubmitFailed);
            return;
          }
          onClose();
          await onUpdated?.(updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : wf.taskSubmitFailed);
      } finally {
        setSaving(false);
      }
    },
    [
      activeDefinitions,
      customFieldDraft,
      editDocCount,
      form,
      mode,
      onClose,
      onCreated,
      onUpdated,
      project.summary.id,
      project.summary.slug,
      task,
      wf.taskSubmitFailed,
    ]
  );

  const handleCustomFieldValueChange = useCallback((fieldKey: string, value: string) => {
    setCustomFieldDraft((prev) => ({ ...prev, [fieldKey]: value }));
    setError(null);
  }, []);

  const handleCreateCustomField = useCallback(
    async (label: string) => {
      const created = await createDefinition(label, customFieldScope);
      return created != null;
    },
    [createDefinition, customFieldScope]
  );

  const handleConfirmDiscard = useCallback(() => {
    setDiscardConfirmOpen(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const assigneeOptions = (() => {
    const options = getWorkflowTaskAssigneeOptions(
      isApiSource,
      assignmentCatalog,
      project.summary.contact,
      dash.user?.id,
      mode === 'edit' ? null : form.assignedMemberId
    );
    if (mode !== 'edit' || task?.assignedTo == null || !form.assignedMemberId) {
      return options;
    }
    if (options.some((option) => option.id === form.assignedMemberId)) {
      return options;
    }
    return [
      ...options,
      {
        id: task.assignedTo.id,
        label: task.assignedTo.displayName,
        member: task.assignedTo,
      },
    ];
  })();

  const isPaymentModal = modalContext === 'payment';
  const title =
    mode === 'create'
      ? isPaymentModal
        ? payments.milestoneDrawerCreate
        : wf.taskModalCreate
      : isPaymentModal
        ? payments.milestoneDrawerEdit
        : wf.taskModalEdit;
  const submitLabel = mode === 'create' ? wf.taskSubmitCreate : wf.taskSubmit;
  const isPaymentTask = isPaymentModal || form.taskKind === 'payment';
  const documentsRequired = form.documentsRequired === 'yes';
  const canSelectDone = canMarkWorkflowTaskDone({ documentsRequired }, editDocCount);
  const isStatusDisabled = (status: WorkflowTaskStatus) =>
    status === 'done' && documentsRequired && !canSelectDone;
  const showAssignee = assigneeOptions.length > 0;
  const createCopy = content.crm.create;

  return (
    <>
      <div
        className={styles.overlay}
        onClick={handleRequestClose}
        role="presentation"
      >
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="workflow-task-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2 id="workflow-task-modal-title" className={styles.modalTitle}>
              {title}
            </h2>
            <button
              type="button"
              className={styles.modalClose}
              onClick={handleRequestClose}
              disabled={saving}
              aria-label={wf.taskModalCloseAriaLabel}
            >
              ×
            </button>
          </div>
          <div className={styles.modalBody}>
            <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
              <div className={styles.formScroll}>
                <div
                  className={[
                    styles.rowTaskPrimary,
                    showAssignee ? '' : styles.rowTaskPrimaryNoAssignee,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className={`${formStyles.field} ${styles.rowField}`}>
                    <label className={formStyles.label} htmlFor="workflow-task-title">
                      {wf.fields.title} *
                    </label>
                    <input
                      id="workflow-task-title"
                      className={formStyles.input}
                      value={form.title}
                      disabled={saving}
                      autoFocus
                      onChange={(e) => updateField('title', e.target.value)}
                    />
                  </div>

                  {isPaymentTask ? (
                    <div className={`${formStyles.field} ${styles.rowField}`}>
                      <label className={formStyles.label} htmlFor="workflow-task-amount">
                        {wf.fields.amountUsd} *
                      </label>
                      <input
                        id="workflow-task-amount"
                        className={formStyles.input}
                        inputMode="decimal"
                        value={form.amountUsd}
                        disabled={saving}
                        onChange={(e) => updateField('amountUsd', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  ) : (
                    <div className={`${formStyles.field} ${styles.rowField}`}>
                      <label className={formStyles.label} htmlFor="workflow-task-stage">
                        {wf.fields.stage}
                      </label>
                      <select
                        id="workflow-task-stage"
                        className={formStyles.select}
                        value={form.stageSlug}
                        disabled={saving || opsStages.length === 0}
                        onChange={(e) =>
                          updateField(
                            'stageSlug',
                            e.target.value as WorkflowTaskFormState['stageSlug']
                          )
                        }
                      >
                        {opsStages.map((stage) => (
                          <option key={stage.slug} value={stage.slug}>
                            {formatWorkflowStageLabel(stage.slug, catalog)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {showAssignee ? (
                    <div className={`${formStyles.fieldAssigneeCompact} ${styles.rowField}`}>
                      <span className={formStyles.label}>{createCopy.fields.assignedShort}</span>
                      <CreateFormAssigneePicker
                        value={form.assignedMemberId}
                        options={assigneeOptions}
                        disabled={saving}
                        unassignedLabel={content.projectDetail.edit.assigneeUnassigned}
                        ariaLabel={wf.fields.assigned}
                        onChange={(memberId) => updateField('assignedMemberId', memberId)}
                      />
                    </div>
                  ) : null}
                </div>

                <div className={styles.rowTaskSecondary}>
                  <div className={`${formStyles.field} ${styles.rowField}`}>
                    <label className={formStyles.label}>{wf.fields.status}</label>
                    <WorkflowStatusPillPicker
                      value={form.status}
                      onChange={(status) => updateField('status', status)}
                      disabled={saving}
                      isStatusDisabled={isStatusDisabled}
                    />
                  </div>
                  <div className={`${formStyles.field} ${styles.rowField}`}>
                    <label className={formStyles.label} htmlFor="workflow-task-documents-required">
                      {wf.fields.documentsRequired}
                    </label>
                    <select
                      id="workflow-task-documents-required"
                      className={formStyles.select}
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
                  </div>
                  <div className={`${formStyles.field} ${styles.rowField}`}>
                    <label className={formStyles.label} htmlFor="workflow-task-due">
                      {wf.fields.due}
                    </label>
                    <input
                      id="workflow-task-due"
                      type="date"
                      className={formStyles.input}
                      value={form.dueAt}
                      disabled={saving}
                      onChange={(e) => updateField('dueAt', e.target.value)}
                    />
                  </div>
                </div>

                <div className={`${formStyles.field} ${styles.rowNotes}`}>
                  <label className={formStyles.label} htmlFor="workflow-task-notes">
                    {wf.fields.notes}
                  </label>
                  <textarea
                    id="workflow-task-notes"
                    className={formStyles.textarea}
                    value={form.notes}
                    disabled={saving}
                    onChange={(e) => updateField('notes', e.target.value)}
                  />
                </div>

                {isPaymentTask ? (
                  <div className={styles.rowPaymentDates}>
                    <div className={`${formStyles.field} ${styles.rowField}`}>
                      <label className={formStyles.label} htmlFor="workflow-task-invoiced">
                        {payments.columns.invoiced}
                      </label>
                      <input
                        id="workflow-task-invoiced"
                        type="date"
                        className={formStyles.input}
                        value={form.invoicedAt}
                        disabled={saving}
                        onChange={(e) => updateField('invoicedAt', e.target.value)}
                      />
                    </div>
                    <div className={`${formStyles.field} ${styles.rowField}`}>
                      <label className={formStyles.label} htmlFor="workflow-task-paid">
                        {payments.columns.paid}
                      </label>
                      <input
                        id="workflow-task-paid"
                        type="date"
                        className={formStyles.input}
                        value={form.paidAt}
                        disabled={saving}
                        onChange={(e) => updateField('paidAt', e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}

                <WorkflowTaskCustomFieldsSection
                  scope={customFieldScope}
                  values={customFieldDraft}
                  disabled={saving}
                  onValueChange={handleCustomFieldValueChange}
                  onAddField={() => setAddCustomFieldOpen(true)}
                />

                {error ? <p className={formStyles.error}>{error}</p> : null}
              </div>

              <div className={styles.formFooter}>
                <button
                  type="button"
                  className={formStyles.cancelButton}
                  onClick={handleRequestClose}
                  disabled={saving}
                >
                  {content.projectDetail.edit.cancel}
                </button>
                <button type="submit" className={formStyles.submitButton} disabled={saving}>
                  {saving ? wf.taskSubmitting : submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <AddWorkflowTaskCustomFieldDialog
        isOpen={addCustomFieldOpen}
        saving={isSavingCustomFieldDefinition}
        copy={customFieldCopy}
        onClose={() => setAddCustomFieldOpen(false)}
        onCreate={handleCreateCustomField}
      />

      <ConfirmModal
        isOpen={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        onConfirm={handleConfirmDiscard}
        title={wf.discardChangesTitle}
        message={wf.discardChangesMessage}
        confirmLabel={wf.discardChangesConfirm}
        cancelLabel={content.projectDetail.edit.cancel}
        variant="primary"
      />
    </>
  );
}
