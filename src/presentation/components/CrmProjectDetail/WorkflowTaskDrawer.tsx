'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PIPELINE_STAGES, type CrmProjectDetail, type CrmWorkflowTask, type WorkflowTaskStatus } from '@/domain/crm';
import {
  archiveCrmWorkflowTask,
  createCrmWorkflowTask,
  updateCrmWorkflowTask,
} from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';
import { useAuth } from '@/presentation/hooks/useAuth';
import {
  defaultWorkflowTaskFormState,
  formToUpdateInput,
  validateWorkflowTaskForm,
  workflowTaskToFormState,
  type WorkflowTaskFormState,
} from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import { crmRepositories } from '@/shared/di/container';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';

export type WorkflowTaskDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  project: CrmProjectDetail;
  task: CrmWorkflowTask | null;
  isApiSource: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function WorkflowTaskDrawer({
  open,
  mode,
  project,
  task,
  isApiSource,
  onClose,
  onSaved,
}: WorkflowTaskDrawerProps): ReactElement | null {
  const { user } = useAuth();
  const wf = content.projectDetail.workflow;
  const [form, setForm] = useState<WorkflowTaskFormState>(() =>
    mode === 'edit' && task
      ? workflowTaskToFormState(task)
      : defaultWorkflowTaskFormState(project.summary.currentStageSlug)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      mode === 'edit' && task
        ? workflowTaskToFormState(task)
        : defaultWorkflowTaskFormState(project.summary.currentStageSlug)
    );
    setError(null);
    setSaving(false);
  }, [open, mode, task, project.summary.currentStageSlug]);

  const updateField = useCallback(
    <K extends keyof WorkflowTaskFormState>(key: K, value: WorkflowTaskFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      const validated = validateWorkflowTaskForm(form);
      if (!validated.ok) {
        setError(validated.message);
        return;
      }
      setSaving(true);
      try {
        if (mode === 'create') {
          await createCrmWorkflowTask(crmRepositories, {
            projectId: project.summary.id,
            ...validated.body,
          });
        } else if (task) {
          await updateCrmWorkflowTask(crmRepositories, formToUpdateInput(task.id, form));
        }
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : wf.taskSubmitFailed);
      } finally {
        setSaving(false);
      }
    },
    [form, mode, onClose, onSaved, project.summary.id, task, wf.taskSubmitFailed]
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

  const assigneeOptions = isApiSource
    ? user
      ? [{ id: user.id, label: content.projectDetail.edit.assigneeSelf }]
      : []
    : MOCK_CRM_TEAM_MEMBERS.map((m) => ({ id: m.id, label: m.displayName }));

  const title = mode === 'create' ? wf.taskDrawerCreate : wf.taskDrawerEdit;

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
                  {DEFAULT_PIPELINE_STAGES.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>{wf.fields.status}</label>
                <select
                  className={formStyles.select}
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value as WorkflowTaskStatus)}
                >
                  {(['pending', 'in_progress', 'blocked', 'done', 'skipped'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
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
                <select
                  className={formStyles.select}
                  value={form.assignedMemberId}
                  onChange={(e) => updateField('assignedMemberId', e.target.value)}
                >
                  <option value="">{content.projectDetail.edit.assigneeUnassigned}</option>
                  {assigneeOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
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
