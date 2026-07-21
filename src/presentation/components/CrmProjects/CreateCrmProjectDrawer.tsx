'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCrmProject } from '@/application/use-cases/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import { CrmCreateNotAvailableError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import {
  applyManualStreetAddressEdit,
  applyVerifiedGoogleAddress,
  defaultCreateCrmProjectFormState,
  validateCreateCrmProjectForm,
  type CrmProjectStreetAddressFormField,
  type CreateCrmProjectFormState,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import type { GooglePlacesAddressSelection } from '@/presentation/components/GooglePlacesAddressInput';
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
  const nav = useBuildCoreNavigation();
  const dash = useBuildCoreDashboardContext();
  const { organizationMembershipContext } = useSaaSProfile();
  const allowAssignee = !isBuildCoreMemberRole(organizationMembershipContext?.role);
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const canMutateProjects = canMutateCrmProjectsInCurrentRuntime();
  const isApiSource = getCrmDataSource() === 'api';
  const create = content.crm.create;

  const [form, setForm] = useState<CreateCrmProjectFormState>(defaultCreateCrmProjectFormState);
  const [error, setError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      allowAssignee && canMutateProjects && dash.user?.id
        ? { ...defaultCreateCrmProjectFormState(), assignedMemberId: dash.user.id }
        : { ...defaultCreateCrmProjectFormState(), assignedMemberId: '' }
    );
    setError(null);
    setShowValidationErrors(false);
    setSaving(false);
  }, [allowAssignee, canMutateProjects, dash.user?.id, open]);

  const updateField = useCallback(
    <K extends keyof CreateCrmProjectFormState>(key: K, value: CreateCrmProjectFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateStreetAddressField = useCallback(
    (field: CrmProjectStreetAddressFormField, value: string) => {
      setForm((current) => applyManualStreetAddressEdit(current, field, value));
      setError(null);
    },
    []
  );

  const handleVerifiedAddressSelected = useCallback(
    (address: GooglePlacesAddressSelection) => {
      setForm((current) => applyVerifiedGoogleAddress(current, address));
      setError(null);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setShowValidationErrors(true);

      if (!canMutateProjects) {
        setError(create.mockDisabledMessage);
        return;
      }

      const formForSave = allowAssignee ? form : { ...form, assignedMemberId: '' };
      const validated = validateCreateCrmProjectForm(formForSave);
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
    [
      allowAssignee,
      form,
      canMutateProjects,
      onClose,
      router,
      nav.routes,
      create.mockDisabledMessage,
      create.submitFailed,
    ]
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
          {!canMutateProjects ? <p className={styles.notice}>{create.mockDisabledMessage}</p> : null}

          <form onSubmit={(e) => void handleSubmit(e)}>
            <CreateCrmProjectFormFields
              form={form}
              saving={saving}
              assigneeOptions={assigneeOptions}
              allowAssignee={allowAssignee}
              showValidationErrors={showValidationErrors}
              onStreetAddressFieldChange={updateStreetAddressField}
              onVerifiedAddressSelected={handleVerifiedAddressSelected}
              updateField={updateField}
            />

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
                {create.cancel}
              </button>
              <button type="submit" className={styles.submitButton} disabled={saving || !canMutateProjects}>
                {saving ? create.submitting : create.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
