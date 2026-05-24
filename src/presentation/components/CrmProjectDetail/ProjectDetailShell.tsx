'use client';

import type { ReactElement, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { useProjectCompletionToggle } from '@/presentation/features/crmProjectDetail/useProjectCompletionToggle';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import {
  ProjectDetailShellProvider,
  type ProjectDetailShellContextValue,
} from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useCrmProjectDeleteConfirmation } from '@/presentation/features/crmProjects/useCrmProjectDeleteConfirmation';
import { queueCrmProjectDeleteSuccessToast } from '@/presentation/features/crmProjects/crmProjectDeleteFeedback';
import { DetailToast } from './DetailToast';
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
  const showCompletionActions = pageContext === 'detail';
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
  const actionsMenuProps = {
    projectSlug: projectSummary.slug,
    projectSummary,
    canDelete,
    deleting,
    onRequestDelete: setPendingDeleteProject,
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
      </div>
    </ProjectDetailShellProvider>
  );
}
