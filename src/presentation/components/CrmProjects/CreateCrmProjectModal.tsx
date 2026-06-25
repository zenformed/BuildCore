'use client';



import type { FormEvent, ReactElement } from 'react';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { CrmProjectDetail, CreateCrmProjectResult } from '@/domain/crm';

import { canManageBuildCoreProjectTemplates } from '@/domain/buildcore/projectTemplateAccess';

import {
  hasCreateProjectTemplateDraftContent,
  type CreateProjectTemplateDraft,
} from '@/domain/crm/projectTemplateDraft';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';

import { createCrmProject, updateCrmProject } from '@/application/use-cases/crm';

import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import { CrmCreateNotAvailableError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';

import {

  defaultCreateCrmProjectFormState,
  createSubprojectFormDefaultsFromParent,
  validateCreateCrmProjectForm,

  type CreateCrmProjectFormState,

} from '@/presentation/features/crmCreate/createCrmProjectFormModel';

import {

  projectDetailToFormState,

  validateProjectDetailForm,

} from '@/presentation/features/crmProjectDetail/projectDetailFormModel';

import { getCrmProjectAssigneeOptions } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';

import { ProjectTemplateDraftSelect } from '@/presentation/components/ProjectTemplates/ProjectTemplateDraftSelect';
import { LoadProjectTemplateDialogs } from '@/presentation/components/ProjectTemplates/LoadProjectTemplateDialogs';
import { useProjectTemplateManager } from '@/presentation/features/projectTemplates/useProjectTemplateManager';

import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';

import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';

import { crmRepositories } from '@/shared/di/container';

import { CreateCrmProjectFormFields } from './CreateCrmProjectFormFields';

import formStyles from './CreateCrmProjectDrawer.module.css';

import styles from './CreateCrmProjectModal.module.css';



export type CreateCrmProjectModalProps = {

  readonly open: boolean;

  readonly onClose: () => void;

  readonly mode?: 'create' | 'edit';

  readonly project?: CrmProjectDetail;

  readonly onCreated?: (created: CreateCrmProjectResult) => void | Promise<void>;

  readonly onUpdated?: (project: CrmProjectDetail) => void | Promise<void>;

  readonly onTemplateToast?: (toast: { kind: 'success' | 'error'; message: string }) => void;

  readonly parentProjectId?: string | null;

  readonly parentProjectSlug?: string | null;

  readonly createTitle?: string;

  readonly redirectOnCreate?: boolean;

  /** When creating a subproject, copy customer/contact/address fields as initial form values. */
  readonly parentProjectForDefaults?: CrmProjectDetail | null;

};



export function CreateCrmProjectModal({

  open,

  onClose,

  mode = 'create',

  project,

  onCreated,

  onUpdated,

  onTemplateToast,

  parentProjectId = null,

  parentProjectSlug = null,

  createTitle,

  redirectOnCreate = true,

  parentProjectForDefaults = null,

}: CreateCrmProjectModalProps): ReactElement {

  const router = useRouter();
  const nav = useBuildCoreNavigation();

  const dash = useBuildCoreDashboardContext();

  const { organizationMembershipContext } = useSaaSProfile();

  const assignmentCatalog = useAssignmentIdentityCatalog();

  const canMutateProjects = canMutateCrmProjectsInCurrentRuntime();
  const isApiSource = getCrmDataSource() === 'api';

  const isEditMode = mode === 'edit';

  const create = content.crm.create;

  const edit = content.projectDetail.edit;

  const copy = isEditMode ? edit : create;
  const modalTitle = !isEditMode && createTitle ? createTitle : copy.title;

  const templateScope: BuildCoreProjectTemplateScope =
    parentProjectId != null ? 'subproject' : 'project';

  const canManageTemplates = useMemo(

    () => canManageBuildCoreProjectTemplates(organizationMembershipContext?.role),

    [organizationMembershipContext?.role]

  );



  const [form, setForm] = useState<CreateCrmProjectFormState>(defaultCreateCrmProjectFormState);

  const [templateDraft, setTemplateDraft] = useState<CreateProjectTemplateDraft | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTemplateToast = useCallback(
    (kind: 'success' | 'error', message: string) => {
      onTemplateToast?.({ kind, message });
    },
    [onTemplateToast]
  );

  const templateManager = useProjectTemplateManager({
    templateScope,
    applyTarget: {
      mode: 'draft',
      onApplyDraft: () => {},
    },
    onSuccess: (message) => handleTemplateToast('success', message),
    onError: (message) => handleTemplateToast('error', message),
  });

  const handleCloseTemplateManage = useCallback(() => {
    templateManager.closeList();
    setTemplateRefreshKey((current) => current + 1);
  }, [templateManager]);



  useEffect(() => {

    if (!open) return;



    if (isEditMode && project != null) {

      setForm(projectDetailToFormState(project));

    } else {

      const baseDefaults =
        parentProjectId != null && parentProjectForDefaults != null
          ? createSubprojectFormDefaultsFromParent(parentProjectForDefaults)
          : defaultCreateCrmProjectFormState();

      setForm(
        canMutateProjects && dash.user?.id
          ? { ...baseDefaults, assignedMemberId: dash.user.id }
          : baseDefaults
      );

      setTemplateDraft(null);
      setSelectedTemplateId('');
      setTemplateRefreshKey(0);

    }



    setError(null);

    setSaving(false);

  }, [canMutateProjects, dash.user?.id, isEditMode, open, parentProjectForDefaults, parentProjectId, project]);



  const handleTemplateDraftChange = useCallback(
    (draft: CreateProjectTemplateDraft | null, templateId: string) => {
      setTemplateDraft(draft);
      setSelectedTemplateId(templateId);
    },
    []
  );

  const updateField = useCallback(
    <K extends keyof CreateCrmProjectFormState>(key: K, value: CreateCrmProjectFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const assigneeOptions = getCrmProjectAssigneeOptions(
    isApiSource,
    assignmentCatalog,
    dash.user?.id
  );



  const handleSubmit = useCallback(

    async (event: FormEvent) => {

      event.preventDefault();

      setError(null);



      if (!canMutateProjects) {

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

          parentProjectId: parentProjectId ?? undefined,

          initialTemplateBlueprints: hasCreateProjectTemplateDraftContent(templateDraft)

            ? templateDraft

            : null,

        });

        await onCreated?.(created);
        onClose();

        if (redirectOnCreate) {

          if (parentProjectSlug && parentProjectId) {

            router.push(nav.routes.projectSubDetail(parentProjectSlug, created.slug));

          } else {

            router.push(nav.routes.projectDetail(created.slug));

          }

        }

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

      canMutateProjects,

      isEditMode,

      onClose,

      onCreated,

      onUpdated,

      project,

      parentProjectId,

      parentProjectSlug,

      redirectOnCreate,

      router,

      templateDraft,

    ]

  );



  return (

    <>

      <CenterConfirmDialog

        isOpen={open}

        title={modalTitle}

        body={

          <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>

            <div className={styles.formScroll}>

              {!canMutateProjects ? <p className={formStyles.notice}>{create.mockDisabledMessage}</p> : null}

              <CreateCrmProjectFormFields
                form={form}
                saving={saving}
                assigneeOptions={assigneeOptions}
                updateField={updateField}
                showNotes={isEditMode}
              />

              {!isEditMode && canManageTemplates && isApiSource ? (
                <ProjectTemplateDraftSelect
                  templateScope={templateScope}
                  disabled={saving}
                  selectedTemplateId={selectedTemplateId}
                  templatesRefreshKey={templateRefreshKey}
                  onDraftChange={handleTemplateDraftChange}
                  onManageClick={templateManager.openList}
                />
              ) : null}

              {error ? <p className={formStyles.error}>{error}</p> : null}

            </div>

            <div className={styles.formFooter}>

              <button type="button" className={formStyles.cancelButton} onClick={onClose} disabled={saving}>

                {copy.cancel}

              </button>

              <button type="submit" className={formStyles.submitButton} disabled={saving || !canMutateProjects}>

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
        <LoadProjectTemplateDialogs
          controller={templateManager}
          mode="manage"
          onCloseList={handleCloseTemplateManage}
        />
      ) : null}

    </>

  );

}

