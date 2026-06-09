'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCrmProject } from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { CrmCreateNotAvailableError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import {
  defaultCreateCrmProjectFormState,
  validateCreateCrmProjectForm,
  type CreateCrmProjectFormState,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import { crmRepositories } from '@/shared/di/container';
import shellStyles from '../../../../app/(dashboard)/dashboard/dashboard.module.css';
import { CreateCrmProjectFormFields } from './CreateCrmProjectFormFields';
import styles from './CreateCrmProjectDrawer.module.css';

export type CreateCrmProjectDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateCrmProjectDrawer({ open, onClose }: CreateCrmProjectDrawerProps): ReactElement | null {
  const router = useRouter();
  const dash = useBuildCoreDashboardContext();
  const assignmentCatalog = useAssignmentIdentityCatalog();
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

  const assigneeOptions = getCrmProjectAssigneeOptions(
    isApiSource,
    assignmentCatalog,
    dash.user?.id
  );

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
            <CreateCrmProjectFormFields
              form={form}
              saving={saving}
              assigneeOptions={assigneeOptions}
              updateField={updateField}
            />

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
