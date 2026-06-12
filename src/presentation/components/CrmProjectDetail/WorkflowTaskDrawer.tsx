'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmProjectDetail,
  type CrmWorkflowTask,
  type PipelineStageSlug,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import {
  archiveCrmWorkflowTask,
  createCrmWorkflowTask,
  updateCrmWorkflowTask,
} from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { getWorkflowTaskAssigneeOptions } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeOptions';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { formatWorkflowStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
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
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';
import { CreateFormAssigneePicker } from '@/presentation/components/crmShared/CreateFormAssigneePicker';
import { WorkflowStatusPillPicker } from './WorkflowStatusPillPicker';

export type WorkflowTaskDrawerContext = 'workflow' | 'payment';

export type WorkflowTaskDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  drawerContext: WorkflowTaskDrawerContext;
  project: CrmProjectDetail;
  task: CrmWorkflowTask | null;
  isApiSource: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function defaultFormForContext(
  drawerContext: WorkflowTaskDrawerContext,
  stageSlug: PipelineStageSlug,
  task: CrmWorkflowTask | null,
  mode: 'create' | 'edit'
): WorkflowTaskFormState {
  if (mode === 'edit' && task) return workflowTaskToFormState(task);
  const base = defaultWorkflowTaskFormState(stageSlug);
  if (drawerContext === 'payment') {
    return { ...base, taskKind: 'payment', stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG };
  }
  return { ...base, taskKind: 'standard' };
}

export function WorkflowTaskDrawer({
  open,
  mode,
  drawerContext,
  project,
  task,
  isApiSource,
  onClose,
  onSaved,
}: WorkflowTaskDrawerProps): ReactElement | null {
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const dash = useBuildCoreDashboardContext();
  const { catalog } = useBuildCorePipelineStages();
  const wf = content.projectDetail.workflow;
  const [form, setForm] = useState<WorkflowTaskFormState>(() =>
    defaultFormForContext(drawerContext, project.summary.currentStageSlug, task, mode)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(defaultFormForContext(drawerContext, project.summary.currentStageSlug, task, mode));
    setError(null);
    setSaving(false);
  }, [open, mode, task, drawerContext, project.summary.currentStageSlug]);

  const updateField = useCallback(
    <K extends keyof WorkflowTaskFormState>(key: K, value: WorkflowTaskFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const docCounts = countDocumentsByTaskId(project.documents);
  const editDocCount = task ? (docCounts.get(task.id) ?? 0) : 0;

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
        if (mode === 'create') {
          await createCrmWorkflowTask(crmRepositories, {
            projectId: project.summary.id,
            projectSlug: project.summary.slug,
            ...validated.body,
          });
        } else if (task) {
          await updateCrmWorkflowTask(
            crmRepositories,
            formToUpdateInput(task.id, form, { docCount: editDocCount })
          );
        }
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : wf.taskSubmitFailed);
      } finally {
        setSaving(false);
      }
    },
    [editDocCount, form, mode, onClose, onSaved, project.summary.id, project.summary.slug, task, wf.taskSubmitFailed]
  );

  const handleArchive = useCallback(async () => {
    if (!task) return;
    setSaving(true);
    setError(null);
    try {
      await archiveCrmWorkflowTask(crmRepositories, task.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : wf.taskSubmitFailed);
    } finally {
      setSaving(false);
    }
  }, [onClose, onSaved, task, wf.taskSubmitFailed]);

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

  const payments = content.projectDetail.payments;
  const isPaymentDrawer = drawerContext === 'payment';
  const title =
    mode === 'create'
      ? isPaymentDrawer
        ? payments.milestoneDrawerCreate
        : wf.taskDrawerCreate
      : isPaymentDrawer
        ? payments.milestoneDrawerEdit
        : wf.taskDrawerEdit;
  const isPaymentTask = isPaymentDrawer || form.taskKind === 'payment';
  const documentsRequired = form.documentsRequired === 'yes';
  const canSelectDone = canMarkWorkflowTaskDone({ documentsRequired }, editDocCount);
  const isStatusDisabled = (status: WorkflowTaskStatus) =>
    status === 'done' && documentsRequired && !canSelectDone;

  return (
    <div className={shellStyles.settingsOverlay} onClick={onClose} role="presentation">
      <div
        className={shellStyles.settingsDrawer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={shellStyles.settingsHeader}>
          <h2 className={shellStyles.settingsTitle}>{title}</h2>
          <button type="button" className={shellStyles.settingsClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={shellStyles.settingsContent}>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>{wf.fields.title} *</label>
              <input
                className={formStyles.input}
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                autoFocus
              />
            </div>
            {isPaymentTask ? (
              <div className={formStyles.rowTwoCol}>
                <div className={formStyles.field}>
                  <label className={formStyles.label} htmlFor="workflow-task-amount">
                    {wf.fields.amountUsd} *
                  </label>
                  <input
                    id="workflow-task-amount"
                    className={formStyles.input}
                    inputMode="decimal"
                    value={form.amountUsd}
                    onChange={(e) => updateField('amountUsd', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.label}>{wf.fields.status}</label>
                  <WorkflowStatusPillPicker
                    value={form.status}
                    onChange={(status) => updateField('status', status)}
                    disabled={saving}
                    isStatusDisabled={isStatusDisabled}
                  />
                </div>
              </div>
            ) : (
              <div className={formStyles.rowTwoCol}>
                <div className={formStyles.field}>
                  <label className={formStyles.label}>{wf.fields.stage}</label>
                  <select
                    className={formStyles.select}
                    value={form.stageSlug}
                    onChange={(e) =>
                      updateField('stageSlug', e.target.value as WorkflowTaskFormState['stageSlug'])
                    }
                  >
                    {catalog.map((stage) => (
                      <option key={stage.slug} value={stage.slug}>
                        {formatWorkflowStageLabel(stage.slug, catalog)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.label}>{wf.fields.status}</label>
                  <WorkflowStatusPillPicker
                    value={form.status}
                    onChange={(status) => updateField('status', status)}
                    disabled={saving}
                    isStatusDisabled={isStatusDisabled}
                  />
                </div>
              </div>
            )}
            <div className={formStyles.rowTwoCol}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>{wf.fields.documentsRequired}</label>
                <select
                  className={formStyles.select}
                  value={form.documentsRequired}
                  onChange={(e) =>
                    updateField('documentsRequired', e.target.value as WorkflowTaskFormState['documentsRequired'])
                  }
                >
                  <option value="yes">{wf.fields.documentsRequiredYes}</option>
                  <option value="no">{wf.fields.documentsRequiredNo}</option>
                </select>
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>{wf.fields.due}</label>
                <input
                  type="date"
                  className={formStyles.input}
                  value={form.dueAt}
                  onChange={(e) => updateField('dueAt', e.target.value)}
                />
              </div>
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>{wf.fields.notes}</label>
              <textarea
                className={formStyles.textarea}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>
            {assigneeOptions.length > 0 ? (
              <div className={formStyles.field}>
                <label className={formStyles.label}>{wf.fields.assigned}</label>
                <CreateFormAssigneePicker
                  variant="field"
                  value={form.assignedMemberId}
                  options={assigneeOptions}
                  disabled={saving}
                  unassignedLabel={content.projectDetail.edit.assigneeUnassigned}
                  ariaLabel={wf.fields.assigned}
                  onChange={(memberId) => updateField('assignedMemberId', memberId)}
                />
              </div>
            ) : null}
            {error ? <p className={formStyles.error}>{error}</p> : null}
            <div className={formStyles.actions}>
              {mode === 'edit' ? (
                <button
                  type="button"
                  className={formStyles.cancelButton}
                  onClick={() => void handleArchive()}
                  disabled={saving}
                >
                  {wf.archiveTask}
                </button>
              ) : (
                <button type="button" className={formStyles.cancelButton} onClick={onClose} disabled={saving}>
                  {content.projectDetail.edit.cancel}
                </button>
              )}
              <button type="submit" className={formStyles.submitButton} disabled={saving}>
                {saving ? wf.taskSubmitting : wf.taskSubmit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
