'use client';

import type { ReactElement, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail, CrmProjectSummary, CrmPriority } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { canManageBuildCoreProjectTemplates } from '@/domain/buildcore/projectTemplateAccess';
import { resolveProjectTemplateScopeForProject } from '@/domain/crm/projectTemplateScope';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import type { ProjectDetailRoutes } from '@/platform/navigation/projectDetailRoutes';
import { useProjectCompletionToggle } from '@/presentation/features/crmProjectDetail/useProjectCompletionToggle';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import { useCrmProjectChildSummaries } from '@/presentation/features/crmProjectDetail/useCrmProjectChildSummaries';
import { useBuildCoreMemberScopedProject } from '@/presentation/features/crmProjectDetail/useBuildCoreMemberScopedProject';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import {
  ProjectDetailShellProvider,
  type ProjectDetailShellContextValue,
} from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { BuildCoreWorkflowTaskAccessProvider } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { BuildCoreProjectSectionAccessProvider } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { queueCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import { useLoadProjectTemplate } from '@/presentation/features/crmProjectDetail/useLoadProjectTemplate';
import { useSaveProjectTemplate } from '@/presentation/features/crmProjectDetail/useSaveProjectTemplate';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { LoadProjectTemplateDialogs } from '@/presentation/components/ProjectTemplates';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { DetailToast } from './DetailToast';
import { SaveProjectTemplateDialog } from './SaveProjectTemplateDialog';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import { ProjectDetailHeaderActions } from './ProjectDetailHeaderActions';
import { ProjectDetailHeaderProgress } from './ProjectDetailHeaderProgress';
import { ProjectPriorityToggle } from './ProjectPriorityToggle';
import { ProjectDetailShellModals } from './ProjectDetailShellModals';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import styles from './ProjectDetail.module.css';

export type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';

export type ProjectDetailShellProps = {
  pageContext: ProjectDetailPageContext;
  project: CrmProjectDetail;
  isApiSource: boolean;
  onBack: () => void;
  onOpenProject?: () => void;
  onOpenParentProject?: () => void;
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
  onBack,
  onOpenProject,
  onOpenParentProject,
  parentProject = null,
  routes,
  parentRouteSlug,
  subSlug,
  onRefresh,
  children,
  isMemberRole,
}: ProjectDetailShellBodyProps): ReactElement {
  const router = useRouter();
  const [editProjectOpen, setEditProjectOpen] = useState(false);
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
  const isParentOverview =
    subSlug == null && scopedProject.summary.parentProjectId == null;
  const {
    rows: childSummaryRows,
    isLoading: childSummariesLoading,
    refetch: refetchChildSummaries,
  } = useCrmProjectChildSummaries(isParentOverview ? scopedProject.summary : null, '');
  const refreshProjectDetail = useCallback(async () => {
    await onRefresh();
    if (isParentOverview) {
      await refetchChildSummaries();
    }
  }, [isParentOverview, onRefresh, refetchChildSummaries]);
  const completion = useProjectCompletionToggle(scopedProject, refreshProjectDetail);
  const projectForWorkspace = showCompletionActions ? completion.project : scopedProject;
  const workspace = useProjectDetailWorkspace(projectForWorkspace);
  const detail = content.projectDetail;
  const projectSummary = workspace.project.summary;
  const childSummaries = isParentOverview
    ? {
        allRows: childSummaryRows,
        isLoading: childSummariesLoading,
        refetch: refetchChildSummaries,
      }
    : null;

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
  const saveTemplate = useSaveProjectTemplate({
    projectSlug: projectSummary.slug,
    templateScope,
    onSuccess: (message) => workspace.setToast({ kind: 'success', message }),
    onError: (message) => workspace.setToast({ kind: 'error', message }),
  });
  const loadTemplate = useLoadProjectTemplate({
    projectSlug: projectSummary.slug,
    templateScope,
    onRefresh: refreshProjectDetail,
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
    onSaveTemplate: saveTemplate.openDialog,
    onLoadTemplate: loadTemplate.openList,
  };

  const showDetailProgress = pageContext === 'detail';
  const headerProgress = showDetailProgress ? <ProjectDetailHeaderProgress /> : null;

  const priorityToggleProps = {
    priority: projectSummary.priority,
    priorityBusy: workspace.savingField === 'priority',
    priorityDisabled: !isApiSource,
    markPriorityLabel: detail.markPriority,
    removePriorityLabel: detail.removePriority,
    onPriorityToggle: (nextPriority: CrmPriority) => {
      void workspace.patchField('priority', nextPriority);
    },
  };

  const headerActions = isMemberRole
    ? undefined
    : showCompletionActions
      ? (
          <ProjectDetailHeaderActions
            {...actionsMenuProps}
            {...priorityToggleProps}
            isComplete={completion.isComplete}
            completionBusy={completion.completionBusy}
            onMarkComplete={completion.requestMarkComplete}
            onMarkIncomplete={completion.requestMarkIncomplete}
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

  const shellValue: ProjectDetailShellContextValue = {
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
    ...workspace,
  };

  return (
    <ProjectDetailShellProvider value={shellValue}>
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
          onBack={onBack}
          onOpenProject={onOpenProject}
          onOpenParentProject={onOpenParentProject}
          parentProject={parentProject}
          actions={headerActions}
          progress={headerProgress}
          onPrimaryPhotoUpdated={workspace.onPrimaryPhotoUpdated}
          onPrimaryPhotoError={(message) => workspace.setToast({ kind: 'error', message })}
          savingField={workspace.savingField}
          patchField={workspace.patchField}
          onEditProject={isMemberRole ? undefined : () => setEditProjectOpen(true)}
        />

        {children}

        {!isMemberRole ? (
          <>
            <ProjectDetailShellModals
              showCompletion={showCompletionActions}
              completion={showCompletionActions ? completion : null}
              workspace={workspace}
              pendingDeleteProject={pendingDeleteProject}
              onCloseDelete={() => setPendingDeleteProject(null)}
              onConfirmDelete={() => void handleConfirmDelete()}
            />
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
            <LoadProjectTemplateDialogs controller={loadTemplate} />
            <CreateCrmProjectModal
              open={editProjectOpen}
              mode="edit"
              project={workspace.project}
              onClose={() => setEditProjectOpen(false)}
              onUpdated={workspace.onProjectSaved}
            />
          </>
        ) : null}
      </div>
    </ProjectDetailShellProvider>
  );
}

export function ProjectDetailShell(props: ProjectDetailShellProps): ReactElement {
  const { organizationMembershipContext } = useSaaSProfile();
  const isMemberRole = isBuildCoreMemberRole(organizationMembershipContext?.role);

  return (
    <BuildCoreWorkflowTaskAccessProvider>
      <BuildCoreProjectSectionAccessProvider>
        <ProjectDetailShellBody {...props} isMemberRole={isMemberRole} />
      </BuildCoreProjectSectionAccessProvider>
    </BuildCoreWorkflowTaskAccessProvider>
  );
}
