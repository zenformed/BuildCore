'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PIPELINE_STAGES, type CrmPriority, type CrmProjectDetail, type CrmTradeType } from '@/domain/crm';
import { CRM_TRADE_TYPE_OPTIONS } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { updateCrmProject } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';
import { useAuth } from '@/presentation/hooks/useAuth';
import {
  projectDetailToFormState,
  validateProjectDetailForm,
} from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { crmRepositories } from '@/shared/di/container';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import styles from '../CrmProjects/CreateCrmProjectDrawer.module.css';

export type EditCrmProjectDrawerProps = {
  open: boolean;
  project: CrmProjectDetail;
  isApiSource: boolean;
  onClose: () => void;
  onSaved: (project: CrmProjectDetail) => void;
};

export function EditCrmProjectDrawer({
  open,
  project,
  isApiSource,
  onClose,
  onSaved,
}: EditCrmProjectDrawerProps): ReactElement | null {
  const { user } = useAuth();
  const edit = content.projectDetail.edit;

  const [form, setForm] = useState<CreateCrmProjectFormState>(() => projectDetailToFormState(project));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(projectDetailToFormState(project));
    setError(null);
    setSaving(false);
  }, [open, project]);

  const updateField = useCallback(
    <K extends keyof CreateCrmProjectFormState>(key: K, value: CreateCrmProjectFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

const validated = validateProjectDetailForm(form);
      if (!validated.ok) {
        setError(validated.message);
        return;
      }

      setSaving(true);
      try {
        const updated = await updateCrmProject(crmRepositories, project.summary.slug, validated.input);
        if (updated == null) {
          setError(edit.notFound);
          return;
        }
        onSaved(updated);
        onClose();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(edit.submitFailed);
        }
      } finally {
        setSaving(false);
      }
    },
    [form, onClose, onSaved, project.summary.slug, edit.notFound, edit.submitFailed]
  );

  if (!open) return null;

  const assigneeOptions = isApiSource
    ? user
      ? [{ id: user.id, label: edit.assigneeSelf }]
      : []
    : MOCK_CRM_TEAM_MEMBERS.map((m) => ({ id: m.id, label: m.displayName }));

  return (
    <div className={shellStyles.settingsOverlay} onClick={onClose} role="presentation">
      <div
        className={shellStyles.settingsDrawer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-crm-project-title"
      >
        <div className={shellStyles.settingsHeader}>
          <h2 id="edit-crm-project-title" className={shellStyles.settingsTitle}>
            {edit.title}
          </h2>
          <button
            type="button"
            className={shellStyles.settingsClose}
            onClick={onClose}
            aria-label={edit.closeAriaLabel}
          >
            ×
          </button>
        </div>

        <div className={shellStyles.settingsContent}>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="crm-create-name">
                {edit.fields.name} *
              </label>
              <input
                id="crm-create-name"
                className={styles.input}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="crm-edit-trade">
                {edit.fields.tradeType} *
              </label>
              <select
                id="crm-edit-trade"
                className={styles.select}
                value={form.tradeType}
                onChange={(e) => updateField('tradeType', e.target.value as CrmTradeType)}
              >
                {CRM_TRADE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="crm-create-contact">
                {edit.fields.contactName} *
              </label>
              <input
                id="crm-create-contact"
                className={styles.input}
                value={form.contactName}
                onChange={(e) => updateField('contactName', e.target.value)}
              />
            </div>

            <div className={styles.rowTwoCol}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="crm-create-email">
                  {edit.fields.email}
                </label>
                <input
                  id="crm-create-email"
                  type="email"
                  className={styles.input}
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="crm-create-phone">
                  {edit.fields.phone}
                </label>
                <input
                  id="crm-create-phone"
                  type="tel"
                  className={styles.input}
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.rowTwoCol}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="crm-create-priority">
                  {edit.fields.priority}
                </label>
                <select
                  id="crm-create-priority"
                  className={styles.select}
                  value={form.priority}
                  onChange={(e) => updateField('priority', e.target.value as CrmPriority)}
                >
                  {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="crm-create-stage">
                  {edit.fields.stage}
                </label>
                <select
                  id="crm-create-stage"
                  className={styles.select}
                  value={form.currentStageSlug}
                  onChange={(e) =>
                    updateField('currentStageSlug', e.target.value as CreateCrmProjectFormState['currentStageSlug'])
                  }
                >
                  {DEFAULT_PIPELINE_STAGES.map((stage) => (
                    <option key={stage.slug} value={stage.slug}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="crm-create-waiting">
                {edit.fields.waitingOn}
              </label>
              <input
                id="crm-create-waiting"
                className={styles.input}
                value={form.waitingOn}
                onChange={(e) => updateField('waitingOn', e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="crm-create-notes">
                {edit.fields.notes}
              </label>
              <textarea
                id="crm-create-notes"
                className={styles.textarea}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>

            <div className={styles.rowTwoCol}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="crm-create-deal">
                  {edit.fields.dealValue}
                </label>
                <input
                  id="crm-create-deal"
                  className={styles.input}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.dealValueUsd}
                  onChange={(e) => updateField('dealValueUsd', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="crm-create-balance">
                  {edit.fields.balance}
                </label>
                <input
                  id="crm-create-balance"
                  className={styles.input}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.balanceUsd}
                  onChange={(e) => updateField('balanceUsd', e.target.value)}
                />
              </div>
            </div>

            {assigneeOptions.length > 0 ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="crm-create-assignee">
                  {edit.fields.assigned}
                </label>
                <select
                  id="crm-create-assignee"
                  className={styles.select}
                  value={form.assignedMemberId}
                  onChange={(e) => updateField('assignedMemberId', e.target.value)}
                >
                  <option value="">{edit.assigneeUnassigned}</option>
                  {assigneeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
                {edit.cancel}
              </button>
              <button type="submit" className={styles.submitButton} disabled={saving}>
                {saving ? edit.submitting : edit.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

