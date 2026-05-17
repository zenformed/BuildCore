'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_PIPELINE_STAGES, type CrmPriority, type CrmTradeType } from '@/domain/crm';
import { CRM_TRADE_TYPE_OPTIONS } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { createCrmProject } from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { CrmCreateNotAvailableError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm';
import { useAuth } from '@/presentation/hooks/useAuth';
import {
  defaultCreateCrmProjectFormState,
  validateCreateCrmProjectForm,
  type CreateCrmProjectFormState,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { crmRepositories } from '@/shared/di/container';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import styles from './CreateCrmProjectDrawer.module.css';

export type CreateCrmProjectDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateCrmProjectDrawer({ open, onClose }: CreateCrmProjectDrawerProps): ReactElement | null {
  const router = useRouter();
  const { user } = useAuth();
  const isApiSource = getCrmDataSource() === 'api';
  const create = content.crm.create;

  const [form, setForm] = useState<CreateCrmProjectFormState>(defaultCreateCrmProjectFormState);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(defaultCreateCrmProjectFormState());
    setError(null);
    setSaving(false);
  }, [open]);

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

      if (!isApiSource) {
        setError(create.mockDisabledMessage);
        return;
      }

      const validated = validateCreateCrmProjectForm(form);
      if (!validated.ok) {
        setError(validated.message);
        return;
      }

      setSaving(true);
      try {
        const created = await createCrmProject(crmRepositories, validated.input);
        onClose();
        router.push(nav.routes.projectDetail(created.slug));
      } catch (err) {
        if (err instanceof CrmCreateNotAvailableError) {
          setError(create.mockDisabledMessage);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(create.submitFailed);
        }
      } finally {
        setSaving(false);
      }
    },
    [form, isApiSource, onClose, router, create.mockDisabledMessage, create.submitFailed]
  );

  if (!open) return null;

  const assigneeOptions = isApiSource
    ? user
      ? [{ id: user.id, label: create.assigneeSelf }]
      : []
    : MOCK_CRM_TEAM_MEMBERS.map((m) => ({ id: m.id, label: m.displayName }));

  return (
    <div className={shellStyles.settingsOverlay} onClick={onClose} role="presentation">
      <div
        className={shellStyles.settingsDrawer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-crm-project-title"
      >
        <div className={shellStyles.settingsHeader}>
          <h2 id="create-crm-project-title" className={shellStyles.settingsTitle}>
            {create.title}
          </h2>
          <button
            type="button"
            className={shellStyles.settingsClose}
            onClick={onClose}
            aria-label={create.closeAriaLabel}
          >
            ×
          </button>
        </div>

        <div className={shellStyles.settingsContent}>
          {!isApiSource ? <p className={styles.notice}>{create.mockDisabledMessage}</p> : null}

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="crm-create-name">
                {create.fields.name} *
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
              <label className={styles.label} htmlFor="crm-create-trade">
                {create.fields.tradeType} *
              </label>
              <select
                id="crm-create-trade"
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
                {create.fields.contactName} *
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
                  {create.fields.email}
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
                  {create.fields.phone}
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
                  {create.fields.priority}
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
                  {create.fields.stage}
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
                {create.fields.waitingOn}
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
                {create.fields.notes}
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
                  {create.fields.dealValue}
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
                  {create.fields.balance}
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
                  {create.fields.assigned}
                </label>
                <select
                  id="crm-create-assignee"
                  className={styles.select}
                  value={form.assignedMemberId}
                  onChange={(e) => updateField('assignedMemberId', e.target.value)}
                >
                  <option value="">{create.assigneeUnassigned}</option>
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
                {create.cancel}
              </button>
              <button type="submit" className={styles.submitButton} disabled={saving || !isApiSource}>
                {saving ? create.submitting : create.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

