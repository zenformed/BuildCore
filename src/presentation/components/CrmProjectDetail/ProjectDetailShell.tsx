'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectCompletionToggle } from '@/presentation/features/crmProjectDetail/useProjectCompletionToggle';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import type { ProjectDetailPageContext } from '@/presentation/features/crmProjectDetail/projectDetailPageContext';
import {
  ProjectDetailShellProvider,
  type ProjectDetailShellContextValue,
} from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
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
  includeWorkflowModals?: boolean;
  children: ReactNode;
};

function shellPageClass(pageContext: ProjectDetailPageContext): string {
  return pageContext === 'detail' ? styles.page : styles.pageTasks;
}

function shellPageDataAttributes(
  pageContext: ProjectDetailPageContext
): Record<string, string | undefined> {
  switch (pageContext) {
    case 'detail':
      return { 'data-project-detail-page': '' };
    case 'workflowTasks':
      return { 'data-project-tasks-page': '' };
    case 'financials':
      return { 'data-project-financials-page': '' };
    case 'documents':
      return { 'data-project-documents-page': '' };
    case 'accountability':
      return { 'data-project-accountability-page': '' };
    default:
      return {};
  }
}

export function ProjectDetailShell({
  pageContext,
  project: initialProject,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
  includeWorkflowModals = pageContext === 'detail' || pageContext === 'workflowTasks',
  children,
}: ProjectDetailShellProps): ReactElement {
  const showCompletionActions = pageContext === 'detail';
  const completion = useProjectCompletionToggle(initialProject, onRefresh);
  const projectForWorkspace = showCompletionActions ? completion.project : initialProject;
  const workspace = useProjectDetailWorkspace(projectForWorkspace, onRefresh);
  const detail = content.projectDetail;

  const headerActions = showCompletionActions ? (
    <ProjectDetailHeaderActions
      projectSlug={workspace.project.summary.slug}
      isComplete={completion.isComplete}
      completionBusy={completion.completionBusy}
      onMarkComplete={completion.requestMarkComplete}
      onMarkIncomplete={completion.requestMarkIncomplete}
      markCompleteLabel={detail.markComplete}
      markIncompleteLabel={detail.markIncomplete}
    />
  ) : (
    <ProjectDetailActionsMenu projectSlug={workspace.project.summary.slug} />
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
      <div className={shellPageClass(pageContext)} {...shellPageDataAttributes(pageContext)}>
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

        {includeWorkflowModals ? (
          <ProjectDetailShellModals
            showCompletion={showCompletionActions}
            completion={showCompletionActions ? completion : null}
            workspace={workspace}
          />
        ) : null}
      </div>
    </ProjectDetailShellProvider>
  );
}
