'use client';

import type { ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail } from '@/domain/crm';
import { canManageBuildCoreProjectTemplates } from '@/domain/buildcore/projectTemplateAccess';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { useProjectCompletionToggle } from '@/presentation/features/crmProjectDetail/useProjectCompletionToggle';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import {
  ProjectDetailShellProvider,
  type ProjectDetailShellContextValue,
} from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { BuildCoreWorkflowTaskAccessProvider } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { queueCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import { useLoadProjectTemplate } from '@/presentation/features/crmProjectDetail/useLoadProjectTemplate';
import { useSaveProjectTemplate } from '@/presentation/features/crmProjectDetail/useSaveProjectTemplate';
import { LoadProjectTemplateDialogs } from '@/presentation/components/ProjectTemplates';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { DetailToast } from './DetailToast';
import { SaveProjectTemplateDialog } from './SaveProjectTemplateDialog';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import { ProjectDetailHeaderActions } from './ProjectDetailHeaderActions';
import { ProjectDetailShellModals } from './ProjectDetailShellModals';
import styles from './ProjectDetail.module.css';

export type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';

export type ProjectDetailShellProps = {
  pageContext: ProjectDetailPageContext;
  project: CrmProjectDetail;
  isApiSource: boolean;
  onBack: () => void;
  onOpenProject?: () => void;
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

export function ProjectDetailShell({
  pageContext,
  project: initialProject,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
  children,
}: ProjectDetailShellProps): ReactElement {
  const router = useRouter();
  const { organizationMembershipContext } = useSaaSProfile();
  const showCompletionActions = pageContext === 'detail';
  const canSaveTemplate = useMemo(
    () => canManageBuildCoreProjectTemplates(organizationMembershipContext?.role),
    [organizationMembershipContext?.role]
  );
  const completion = useProjectCompletionToggle(initialProject, onRefresh);
  const projectForWorkspace = showCompletionActions ? completion.project : initialProject;
  const workspace = useProjectDetailWorkspace(projectForWorkspace);
  const detail = content.projectDetail;
  const projectSummary = workspace.project.summary;

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
    onSuccess: (message) => workspace.setToast({ kind: 'success', message }),
    onError: (message) => workspace.setToast({ kind: 'error', message }),
  });
  const loadTemplate = useLoadProjectTemplate({
    projectSlug: projectSummary.slug,
    onRefresh,
    onSuccess: (message) => workspace.setToast({ kind: 'success', message }),
    onError: (message) => workspace.setToast({ kind: 'error', message }),
  });
  const actionsMenuProps = {
    projectSlug: projectSummary.slug,
    projectSummary,
    canDelete,
    canSaveTemplate,
    deleting,
    onRequestDelete: setPendingDeleteProject,
    onSaveTemplate: saveTemplate.openDialog,
    onLoadTemplate: loadTemplate.openList,
  };

  const headerActions = showCompletionActions ? (
    <ProjectDetailHeaderActions
      {...actionsMenuProps}
      isComplete={completion.isComplete}
      completionBusy={completion.completionBusy}
      onMarkComplete={completion.requestMarkComplete}
      onMarkIncomplete={completion.requestMarkIncomplete}
      markCompleteLabel={detail.markComplete}
      markIncompleteLabel={detail.markIncomplete}
    />
  ) : (
    <ProjectDetailActionsMenu {...actionsMenuProps} />
  );

  const shellValue: ProjectDetailShellContextValue = {
    pageContext,
    isApiSource,
    onRefresh,
    showCompletionActions,
    completion: showCompletionActions ? completion : null,
    ...workspace,
  };

  return (
    <ProjectDetailShellProvider value={shellValue}>
      <BuildCoreWorkflowTaskAccessProvider>
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
          onBack={onBack}
          onOpenProject={onOpenProject}
          actions={headerActions}
          savingField={workspace.savingField}
          patchField={workspace.patchField}
        />

        {children}

        <ProjectDetailShellModals
          showCompletion={showCompletionActions}
          completion={showCompletionActions ? completion : null}
          workspace={workspace}
          pendingDeleteProject={pendingDeleteProject}
          onCloseDelete={() => setPendingDeleteProject(null)}
          onConfirmDelete={() => void handleConfirmDelete()}
        />
        <SaveProjectTemplateDialog
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
        </div>
      </BuildCoreWorkflowTaskAccessProvider>
    </ProjectDetailShellProvider>
  );
}
