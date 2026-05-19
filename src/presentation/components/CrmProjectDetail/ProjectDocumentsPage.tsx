'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import { DetailToast } from './DetailToast';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import type { ProjectDetailPageProps } from './ProjectDetailPage';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsPageProps = Pick<
  ProjectDetailPageProps,
  'project' | 'isApiSource' | 'onBack' | 'onRefresh'
> & {
  onOpenProject: () => void;
};

export function ProjectDocumentsPage({
  project: initialProject,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
}: ProjectDocumentsPageProps): ReactElement {
  const workspace = useProjectDetailWorkspace(initialProject, onRefresh);
  const { project, toast, setToast, savingField, patchField } = workspace;

  const handleRefresh = async () => {
    try {
      await onRefresh();
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  };

  return (
    <div className={styles.pageTasks} data-project-documents-page>
      {toast ? <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <ProjectDetailContextBlock
        project={project}
        isApiSource={isApiSource}
        pageContext="documents"
        onBack={onBack}
        onOpenProject={onOpenProject}
        actions={<ProjectDetailActionsMenu projectSlug={project.summary.slug} />}
        savingField={savingField}
        patchField={patchField}
      />

      <section
        className={`${styles.workflowPanel} ${styles.documentsPagePanel}`}
        aria-labelledby="project-documents-heading"
      >
        <div className={styles.cardTitleRow}>
          <h3 id="project-documents-heading" className={styles.cardTitle}>
            {content.projectDetail.sections.documents}
          </h3>
        </div>
        <ProjectDocumentsPanelContent
          project={project}
          onRefresh={handleRefresh}
          onError={(message) => setToast({ kind: 'error', message })}
        />
      </section>
    </div>
  );
}
