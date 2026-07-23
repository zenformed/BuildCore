'use client';

import type { ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail, CrmProjectSummary, CrmPriority } from '@/domain/crm';
import { isCrmProjectInactive } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { canManageBuildCoreProjectTemplates } from '@/domain/buildcore/projectTemplateAccess';
import { resolveProjectTemplateScopeForProject } from '@/domain/crm/projectTemplateScope';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import type { ProjectDetailRoutes } from '@/platform/navigation/projectDetailRoutes';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useProjectCompletionToggle } from '@/presentation/features/crmProjectDetail/useProjectCompletionToggle';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import { useCrmProjectChildSummaries } from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import { useBuildCoreMemberScopedProject } from '@/presentation/features/crmProjectDetail/useBuildCoreMemberScopedProject';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import {
  ProjectDetailShellProvider,
  type ProjectDetailShellContextValue,
} from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { useCrmProjectInactiveActions } from '@/presentation/features/crmProjects/useCrmProjectInactiveActions';
import { queueCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import { useLoadProjectTemplate } from '@/presentation/features/crmProjectDetail/useLoadProjectTemplate';
import { useSaveProjectTemplate } from '@/presentation/features/crmProjectDetail/useSaveProjectTemplate';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { LoadProjectTemplateDialogs } from '@/presentation/components/ProjectTemplates';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { DetailToast } from './DetailToast';
import { CrmDirectUploadStatusProvider } from './CrmDirectUploadStatus';
import { SaveProjectTemplateDialog } from './SaveProjectTemplateDialog';
import { ProjectQrDialog } from './ProjectQrDialog';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import type { ProjectDetailBreadcrumbNavigation } from './ProjectDetailBreadcrumbNav';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import { ProjectDetailHeaderActions } from './ProjectDetailHeaderActions';
import { ProjectDetailHeaderProgress } from './ProjectDetailHeaderProgress';
import { ProjectPriorityToggle } from './ProjectPriorityToggle';
import { ProjectDetailShellModals } from './ProjectDetailShellModals';
import { MarkInactiveDialog } from '@/presentation/components/CrmProjects/MarkInactiveDialog';
import { WorkflowTaskModal } from './WorkflowTaskModal';
import styles from './ProjectDetail.module.css';

export type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';

export type ProjectDetailShellProps = {
  pageContext: ProjectDetailPageContext;
  project: CrmProjectDetail;
  isApiSource: boolean;
  breadcrumbNavigation: ProjectDetailBreadcrumbNavigation;
  parentProject?: CrmProjectSummary | null;
  routes: ProjectDetailRoutes;
  parentRouteSlug: string;
  subSlug?: string;
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

type ProjectDetailShellBodyProps = ProjectDetailShellProps & {
  readonly isMemberRole: boolean;
};

function ProjectDetailShellBody({
  pageContext,
  project: initialProject,
  isApiSource,
  breadcrumbNavigation,
  parentProject = null,
  routes,
  parentRouteSlug,
  subSlug,
  onRefresh,
  children,
  isMemberRole,
}: ProjectDetailShellBodyProps): ReactElement {
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const canMutateProjects = canMutateCrmProjectsInCurrentRuntime();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { organizationMembershipContext } = useSaaSProfile();
  const showCompletionActions = pageContext === 'detail' && !isMemberRole;
  const scopedProject = useBuildCoreMemberScopedProject(initialProject, isMemberRole, isApiSource);
  const canSaveTemplate = useMemo(
    () => canManageBuildCoreProjectTemplates(organizationMembershipContext?.role),
    [organizationMembershipContext?.role]
  );
  const templateScope = resolveProjectTemplateScopeForProject({
    parentProjectId: scopedProject.summary.parentProjectId,
  });
  const templateScopeCopy = getProjectTemplateScopeCopy(templateScope);
  const isMobileLayout = useDashboardMobileLayout();
  const isMobileDetailOverview = isMobileLayout && pageContext === 'detail';
  const isParentOverview =
    subSlug == null && scopedProject.summary.parentProjectId == null;
  const {
    rows: childSummaryRows,
    isLoading: childSummariesLoading,
    refetch: refetchChildSummaries,
    appendProjectSummary: appendChildProjectSummary,
    patchProjectSummary: patchChildProjectSummary,
  } = useCrmProjectChildSummaries(isParentOverview ? scopedProject.summary : null, '');
  const { refetch: refetchRollupIndexes } = useCrmPaymentTasksIndexContext();
  const refreshProjectDetail = useCallback(async () => {
    await onRefresh();
    await refetchRollupIndexes();
    if (isParentOverview) {
      await refetchChildSummaries();
    }
  }, [isParentOverview, onRefresh, refetchChildSummaries, refetchRollupIndexes]);

  useEffect(() => {
    if (!isParentOverview) return;
    void refetchChildSummaries();
    void refetchRollupIndexes();
  }, [isParentOverview, parentRouteSlug, refetchChildSummaries, refetchRollupIndexes]);
  const { catalogForProject } = useBuildCorePipelineStages();
  const pipelineStageCatalog = catalogForProject({
    parentProjectId: scopedProject.summary.parentProjectId,
  });
  const completion = useProjectCompletionToggle(scopedProject, {
    stages: pipelineStageCatalog,
  });
  const projectForWorkspace = showCompletionActions ? completion.project : scopedProject;
  const workspace = useProjectDetailWorkspace(projectForWorkspace);
  const { refreshWorkflowTasks } = workspace;
  const refreshAfterTemplateApply = useCallback(async () => {
    await refreshWorkflowTasks();
  }, [refreshWorkflowTasks]);
  const detail = content.projectDetail;
  const markInactiveCopy = content.projectDetail.subprojects.markInactive;
  const markActiveCopy = content.projectDetail.subprojects.markActive;
  const projectSummary = workspace.project.summary;
  const isSubproject = projectSummary.parentProjectId != null;
  const {
    markInactiveTarget,
    openMarkInactive,
    closeMarkInactive,
    submitting: markingInactive,
    markingActive,
    markingActiveProjectId,
    submitMarkInactive,
    markProjectActive,
  } = useCrmProjectInactiveActions({
    onProjectsUpdated: () => {
      void refreshProjectDetail();
    },
    onMarkInactiveSuccess: () => {
      workspace.setToast({ kind: 'success', message: markInactiveCopy.success });
    },
    onMarkActiveSuccess: () => {
      workspace.setToast({ kind: 'success', message: markActiveCopy.success });
    },
    onError: (message) => workspace.setToast({ kind: 'error', message }),
  });
  const lifecycleBusy = markingInactive || markingActive || markingActiveProjectId != null;
  const isProjectInactive = isCrmProjectInactive(projectSummary);
  const projectMutationsLocked = isProjectInactive && !isMemberRole;
  const inactiveEditCopy = markActiveCopy;
  const pendingEditActionRef = useRef<(() => void) | null>(null);
  const [inactiveEditPromptOpen, setInactiveEditPromptOpen] = useState(false);

  const guardProjectEdit = useCallback(
    (onAllowed: () => void) => {
      if (!projectMutationsLocked) {
        onAllowed();
        return;
      }
      pendingEditActionRef.current = onAllowed;
      setInactiveEditPromptOpen(true);
    },
    [projectMutationsLocked]
  );

  const handleCloseInactiveEditPrompt = useCallback(() => {
    if (markingActive) return;
    pendingEditActionRef.current = null;
    setInactiveEditPromptOpen(false);
  }, [markingActive]);

  const handleConfirmInactiveEditActivate = useCallback(() => {
    const pending = pendingEditActionRef.current;
    void (async () => {
      const ok = await markProjectActive(projectSummary);
      setInactiveEditPromptOpen(false);
      pendingEditActionRef.current = null;
      if (ok) {
        await refreshProjectDetail();
        pending?.();
      }
    })();
  }, [markProjectActive, projectSummary, refreshProjectDetail]);

  const projectLifecycleProps = canMutateProjects && !isMemberRole
    ? {
        isSubproject,
        onRequestMarkInactive: () => {
          openMarkInactive({ mode: 'single', project: projectSummary });
        },
        onRequestMarkActive: () => {
          void markProjectActive(projectSummary);
        },
        lifecycleBusy,
      }
    : {
        isSubproject,
        lifecycleBusy,
      };
  const childSummaries = useMemo(
    () =>
      isParentOverview
        ? {
            allRows: childSummaryRows,
            isLoading: childSummariesLoading,
            refetch: refetchChildSummaries,
            appendProjectSummary: appendChildProjectSummary,
            patchProjectSummary: patchChildProjectSummary,
          }
        : null,
    [
      appendChildProjectSummary,
      childSummariesLoading,
      childSummaryRows,
      isParentOverview,
      patchChildProjectSummary,
      refetchChildSummaries,
    ]
  );

  const {
    pendingDeleteProject,
    setPendingDeleteProject,
    deletingProjectId,
    canDelete,
    handleConfirmDelete,
  } = useCrmProjectDeleteConfirmation({
    onProjectDeleted: () => {},
    onSuccess: (message) => {
      queueCrmProjectDeleteSuccessToast(message);
      router.push(nav.routes.dashboard);
    },
    onError: (message) => workspace.setToast({ kind: 'error', message }),
  });

  const deleting = deletingProjectId === projectSummary.id;
  const canShowQrCode = projectSummary.parentProjectId == null;
  const saveTemplate = useSaveProjectTemplate({
    projectSlug: projectSummary.slug,
    templateScope,
    onSuccess: (message) => workspace.setToast({ kind: 'success', message }),
    onError: (message) => workspace.setToast({ kind: 'error', message }),
  });
  const loadTemplate = useLoadProjectTemplate({
    projectSlug: projectSummary.slug,
    templateScope,
    onRefresh: refreshAfterTemplateApply,
    onSuccess: (message) => workspace.setToast({ kind: 'success', message }),
    onError: (message) => workspace.setToast({ kind: 'error', message }),
  });
  const actionsMenuProps = {
    routes,
    projectSummary,
    canDelete,
    canSaveTemplate,
    loadTemplateLabel: templateScopeCopy.actionsLoad,
    saveTemplateLabel: templateScopeCopy.actionsSave,
    deleting,
    onRequestDelete: setPendingDeleteProject,
    onSaveTemplate: () => {
      guardProjectEdit(() => {
        saveTemplate.openDialog();
      });
    },
    onLoadTemplate: () => {
      guardProjectEdit(() => {
        loadTemplate.openList();
      });
    },
    canShowQrCode,
    onShowQrCode: () => setQrDialogOpen(true),
    ...projectLifecycleProps,
  };

  const showDetailProgress = pageContext === 'detail';
  const headerProgress = showDetailProgress ? <ProjectDetailHeaderProgress /> : null;

  const priorityToggleProps = {
    priority: projectSummary.priority,
    priorityBusy: workspace.savingField === 'priority',
    priorityDisabled: !canMutateProjects,
    markPriorityLabel: detail.markPriority,
    removePriorityLabel: detail.removePriority,
    onPriorityToggle: (nextPriority: CrmPriority) => {
      guardProjectEdit(() => {
        void workspace.patchField('priority', nextPriority);
      });
    },
  };

  const guardedOpenCreateWorkflowTask = useCallback(
    (input: Parameters<typeof workspace.openCreateWorkflowTask>[0]) => {
      guardProjectEdit(() => {
        workspace.openCreateWorkflowTask(input);
      });
    },
    [guardProjectEdit, workspace]
  );

  const guardedOpenEditWorkflowTask = useCallback(
    (task: Parameters<typeof workspace.openEditWorkflowTask>[0]) => {
      guardProjectEdit(() => {
        workspace.openEditWorkflowTask(task);
      });
    },
    [guardProjectEdit, workspace]
  );

  const guardedPatchField = useCallback(
    (...args: Parameters<typeof workspace.patchField>) => {
      if (projectMutationsLocked) {
        guardProjectEdit(() => {
          void workspace.patchField(...args);
        });
        return Promise.resolve(false);
      }
      return workspace.patchField(...args);
    },
    [guardProjectEdit, projectMutationsLocked, workspace]
  );

  const guardedPatchIndustry = useCallback(
    (...args: Parameters<typeof workspace.patchIndustry>) => {
      if (projectMutationsLocked) {
        guardProjectEdit(() => {
          void workspace.patchIndustry(...args);
        });
        return Promise.resolve(false);
      }
      return workspace.patchIndustry(...args);
    },
    [guardProjectEdit, projectMutationsLocked, workspace]
  );

  const headerActions = isMemberRole
    ? undefined
    : showCompletionActions
      ? (
          <ProjectDetailHeaderActions
            {...actionsMenuProps}
            {...priorityToggleProps}
            isComplete={completion.isComplete}
            completionBusy={completion.completionBusy}
            onMarkComplete={() => {
              guardProjectEdit(() => {
                completion.requestMarkComplete();
              });
            }}
            onMarkIncomplete={() => {
              guardProjectEdit(() => {
                completion.requestMarkIncomplete();
              });
            }}
            markCompleteLabel={detail.markComplete}
            markIncompleteLabel={detail.markIncomplete}
          />
        )
      : (
          <div className={styles.detailHeaderActions}>
            <ProjectPriorityToggle
              priority={priorityToggleProps.priority}
              busy={priorityToggleProps.priorityBusy || deleting}
              disabled={priorityToggleProps.priorityDisabled}
              markPriorityLabel={priorityToggleProps.markPriorityLabel}
              removePriorityLabel={priorityToggleProps.removePriorityLabel}
              onToggle={priorityToggleProps.onPriorityToggle}
            />
            <ProjectDetailActionsMenu {...actionsMenuProps} />
          </div>
        );

  const shellValue: ProjectDetailShellContextValue = useMemo(
    () => ({
      pageContext,
      isApiSource,
      onRefresh: refreshProjectDetail,
      showCompletionActions,
      isMemberRole,
      completion: showCompletionActions ? completion : null,
      parentRouteSlug,
      subSlug,
      parentProject,
      routes,
      childSummaries,
      isProjectInactive,
      projectMutationsLocked,
      guardProjectEdit,
      ...workspace,
      openCreateWorkflowTask: guardedOpenCreateWorkflowTask,
      openEditWorkflowTask: guardedOpenEditWorkflowTask,
      patchField: guardedPatchField,
      patchIndustry: guardedPatchIndustry,
    }),
    [
      childSummaries,
      completion,
      guardProjectEdit,
      guardedOpenCreateWorkflowTask,
      guardedOpenEditWorkflowTask,
      guardedPatchField,
      guardedPatchIndustry,
      isApiSource,
      isMemberRole,
      isProjectInactive,
      pageContext,
      parentProject,
      parentRouteSlug,
      projectMutationsLocked,
      refreshProjectDetail,
      routes,
      showCompletionActions,
      subSlug,
      workspace,
    ]
  );

  return (
    <ProjectDetailShellProvider value={shellValue}>
      <CrmDirectUploadStatusProvider>
      <div className={styles.pageShell}>
        {workspace.toast ? (
          <DetailToast
            kind={workspace.toast.kind}
            message={workspace.toast.message}
            onDismiss={() => workspace.setToast(null)}
          />
        ) : null}

        <ProjectDetailContextBlock
          project={workspace.project}
          isApiSource={isApiSource}
          pageContext={pageContext}
          isMemberRole={isMemberRole}
          breadcrumbNavigation={breadcrumbNavigation}
          parentProject={parentProject}
          actions={headerActions}
          progress={headerProgress}
          onPrimaryPhotoUpdated={workspace.onPrimaryPhotoUpdated}
          onPrimaryPhotoError={(message) => workspace.setToast({ kind: 'error', message })}
          savingField={workspace.savingField}
          patchField={guardedPatchField}
          patchIndustry={guardedPatchIndustry}
          scrollBody={isMobileDetailOverview ? children : undefined}
        />

        {!isMobileDetailOverview ? children : null}

        {!isMemberRole ? (
          <>
            <ConfirmModal
              isOpen={inactiveEditPromptOpen}
              onClose={handleCloseInactiveEditPrompt}
              onConfirm={handleConfirmInactiveEditActivate}
              title={inactiveEditCopy.editRequiresActiveTitle}
              message={inactiveEditCopy.editRequiresActiveMessage}
              confirmLabel={inactiveEditCopy.editRequiresActiveConfirm}
              cancelLabel={inactiveEditCopy.editRequiresActiveCancel}
              variant="primary"
              hideIcon
            />
            <ProjectDetailShellModals
              showCompletion={showCompletionActions}
              completion={showCompletionActions ? completion : null}
              workspace={workspace}
              pendingDeleteProject={pendingDeleteProject}
              onCloseDelete={() => setPendingDeleteProject(null)}
              onConfirmDelete={() => void handleConfirmDelete()}
              deleteConfirmDisabled={deleting}
            />
            {saveTemplate.open ? (
              <SaveProjectTemplateDialog
                templateScope={templateScope}
                isOpen={saveTemplate.open}
                templateName={saveTemplate.templateName}
                setAsDefault={saveTemplate.setAsDefault}
                saving={saveTemplate.saving}
                onTemplateNameChange={saveTemplate.setTemplateName}
                onSetAsDefaultChange={saveTemplate.setSetAsDefault}
                onClose={saveTemplate.closeDialog}
                onSave={() => void saveTemplate.saveTemplate()}
              />
            ) : null}
            {loadTemplate.listOpen || loadTemplate.pendingApply || loadTemplate.pendingDelete ? (
              <LoadProjectTemplateDialogs controller={loadTemplate} />
            ) : null}
            {canShowQrCode ? (
              <ProjectQrDialog
                open={qrDialogOpen}
                project={projectSummary}
                onClose={() => setQrDialogOpen(false)}
              />
            ) : null}
            {canMutateProjects && !isMemberRole ? (
              <MarkInactiveDialog
                target={markInactiveTarget}
                submitting={markingInactive}
                onClose={closeMarkInactive}
                onSubmit={(values) => {
                  void submitMarkInactive(values);
                }}
              />
            ) : null}

            <WorkflowTaskModal
              open={workspace.taskModal.open}
              mode={workspace.taskModal.mode}
              modalContext={workspace.taskModal.context}
              defaultStageSlug={workspace.taskModal.defaultStageSlug}
              project={workspace.project}
              task={workspace.taskModal.task}
              isApiSource={isApiSource}
              onClose={workspace.closeTaskModal}
              onCreated={(task) => void workspace.handleWorkflowTaskCreated(task)}
              onUpdated={(task) => void workspace.handleWorkflowTaskPatched(task)}
            />
          </>
        ) : null}
      </div>
      </CrmDirectUploadStatusProvider>
    </ProjectDetailShellProvider>
  );
}

export function ProjectDetailShell(props: ProjectDetailShellProps): ReactElement {
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);

  return <ProjectDetailShellBody {...props} isMemberRole={isMemberRole} />;
}
