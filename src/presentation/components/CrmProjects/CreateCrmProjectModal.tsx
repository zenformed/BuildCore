'use client';

import type { FormEvent, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail } from '@/domain/crm';
import { canManageBuildCoreProjectTemplates } from '@/domain/buildcore/projectTemplateAccess';
import {
  createProjectTemplateDraftFromTemplate,
  createProjectTemplateDraftSummary,
  hasCreateProjectTemplateDraftContent,
  type CreateProjectTemplateDraft,
} from '@/domain/crm/projectTemplateDraft';
import { createCrmProject, updateCrmProject } from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { CrmCreateNotAvailableError } from '@/infrastructure/crm/errors';
import { listBuildCoreProjectTemplates } from '@/infrastructure/crm/api/crmProjectTemplateClient';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import {
  defaultCreateCrmProjectFormState,
  validateCreateCrmProjectForm,
  type CreateCrmProjectFormState,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  projectDetailToFormState,
  validateProjectDetailForm,
} from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { useProjectTemplateManager } from '@/presentation/features/projectTemplates/useProjectTemplateManager';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import { LoadProjectTemplateDialogs } from '@/presentation/components/ProjectTemplates';
import { crmRepositories } from '@/shared/di/container';
import { CreateCrmProjectFormFields } from './CreateCrmProjectFormFields';
import formStyles from './CreateCrmProjectDrawer.module.css';
import styles from './CreateCrmProjectModal.module.css';

export type CreateCrmProjectModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly mode?: 'create' | 'edit';
  readonly project?: CrmProjectDetail;
  readonly onCreated?: () => void | Promise<void>;
  readonly onUpdated?: (project: CrmProjectDetail) => void | Promise<void>;
  readonly onTemplateToast?: (toast: { kind: 'success' | 'error'; message: string }) => void;
};

export function CreateCrmProjectModal({
  open,
  onClose,
  mode = 'create',
  project,
  onCreated,
  onUpdated,
  onTemplateToast,
}: CreateCrmProjectModalProps): ReactElement {
  const router = useRouter();
  const dash = useBuildCoreDashboardContext();
  const { organizationMembershipContext } = useSaaSProfile();
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const isApiSource = getCrmDataSource() === 'api';
  const isEditMode = mode === 'edit';
  const create = content.crm.create;
  const edit = content.projectDetail.edit;
  const copy = isEditMode ? edit : create;
  const templateCopy = content.projectDetail.loadTemplate;
  const canManageTemplates = useMemo(
    () => canManageBuildCoreProjectTemplates(organizationMembershipContext?.role),
    [organizationMembershipContext?.role]
  );

  const [form, setForm] = useState<CreateCrmProjectFormState>(defaultCreateCrmProjectFormState);
  const [templateDraft, setTemplateDraft] = useState<CreateProjectTemplateDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const defaultAppliedRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    if (isEditMode && project != null) {
      setForm(projectDetailToFormState(project));
    } else {
      setForm(defaultCreateCrmProjectFormState());
      setTemplateDraft(null);
      defaultAppliedRef.current = false;
    }

    setError(null);
    setSaving(false);
  }, [isEditMode, open, project]);

  useEffect(() => {
    if (!open || isEditMode || !isApiSource || !canManageTemplates || defaultAppliedRef.current) {
      return;
    }
    defaultAppliedRef.current = true;

    void (async () => {
      try {
        const templates = await listBuildCoreProjectTemplates();
        const defaultTemplate = templates.find((item) => item.isDefault);
        if (defaultTemplate != null) {
          setTemplateDraft(createProjectTemplateDraftFromTemplate(defaultTemplate));
        }
      } catch {
        /* Modal still works without auto-default template */
      }
    })();
  }, [canManageTemplates, isApiSource, isEditMode, open]);

  const updateField = useCallback(
    <K extends keyof CreateCrmProjectFormState>(key: K, value: CreateCrmProjectFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const notifyTemplate = useCallback(
    (kind: 'success' | 'error', message: string) => {
      onTemplateToast?.({ kind, message });
    },
    [onTemplateToast]
  );

  const templateManager = useProjectTemplateManager({
    applyTarget: {
      mode: 'draft',
      onApplyDraft: (blueprints) => setTemplateDraft(blueprints),
    },
    onSuccess: (message) => notifyTemplate('success', message),
    onError: (message) => notifyTemplate('error', message),
  });

  const assigneeOptions = getCrmProjectAssigneeOptions(
    isApiSource,
    assignmentCatalog,
    dash.user?.id
  );
  const draftSummary = createProjectTemplateDraftSummary(templateDraft);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError(null);

      if (!isApiSource) {
        setError(create.mockDisabledMessage);
        return;
      }

      if (isEditMode) {
        if (project == null) {
          setError(edit.notFound);
          return;
        }

        const validated = validateProjectDetailForm(form, project);
        if (!validated.ok) {
          setError(validated.message);
          return;
        }

        setSaving(true);
        try {
          const updated = await updateCrmProject(
            crmRepositories,
            project.summary.slug,
            validated.input
          );
          if (updated == null) {
            setError(edit.notFound);
            return;
          }
          onClose();
          await onUpdated?.(updated);
        } catch (err) {
          setError(err instanceof Error ? err.message : edit.submitFailed);
        } finally {
          setSaving(false);
        }
        return;
      }

      const validated = validateCreateCrmProjectForm(form);
      if (!validated.ok) {
        setError(validated.message);
        return;
      }

      setSaving(true);
      try {
        const created = await createCrmProject(crmRepositories, {
          ...validated.input,
          initialTemplateBlueprints: hasCreateProjectTemplateDraftContent(templateDraft)
            ? templateDraft
            : null,
        });
        onClose();
        await onCreated?.();
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
      create.mockDisabledMessage,
      create.submitFailed,
      edit.notFound,
      edit.submitFailed,
      form,
      isApiSource,
      isEditMode,
      onClose,
      onCreated,
      onUpdated,
      project,
      router,
      templateDraft,
    ]
  );

  return (
    <>
      <CenterConfirmDialog
        isOpen={open}
        title={copy.title}
        body={
          <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
            <div className={styles.formScroll}>
              {!isApiSource ? <p className={formStyles.notice}>{create.mockDisabledMessage}</p> : null}
              <CreateCrmProjectFormFields
                form={form}
                saving={saving}
                assigneeOptions={assigneeOptions}
                updateField={updateField}
              />
              {!isEditMode && canManageTemplates && isApiSource ? (
                <div className={styles.templateRow}>
                  <button
                    type="button"
                    className={styles.templateBtn}
                    disabled={saving || templateManager.busy}
                    onClick={templateManager.openList}
                  >
                    {templateCopy.loadAction}
                  </button>
                </div>
              ) : null}
              {!isEditMode && hasCreateProjectTemplateDraftContent(templateDraft) ? (
                <p className={styles.templateHint}>
                  {templateCopy.draftTemplateApplied(
                    draftSummary.workflowCount,
                    draftSummary.paymentCount
                  )}
                </p>
              ) : null}
              {error ? <p className={formStyles.error}>{error}</p> : null}
            </div>
            <div className={`${formStyles.actions} ${styles.formFooter}`}>
              <button type="button" className={formStyles.cancelButton} onClick={onClose} disabled={saving}>
                {copy.cancel}
              </button>
              <button type="submit" className={formStyles.submitButton} disabled={saving || !isApiSource}>
                {saving ? copy.submitting : copy.submit}
              </button>
            </div>
          </form>
        }
        hideActions
        cancelLabel={copy.cancel}
        onClose={onClose}
        cancelDisabled={saving}
        closeAriaLabel={copy.closeAriaLabel}
        panelClassName={styles.widePanel}
        bodyClassName={styles.modalBody}
      />
      {!isEditMode && canManageTemplates && isApiSource ? (
        <LoadProjectTemplateDialogs controller={templateManager} />
      ) : null}
    </>
  );
}
