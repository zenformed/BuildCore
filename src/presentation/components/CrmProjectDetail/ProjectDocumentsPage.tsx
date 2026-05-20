'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectDetailShell } from './ProjectDetailShell';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import type { ProjectDetailPageProps } from './ProjectDetailPage';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsPageProps = Pick<
  ProjectDetailPageProps,
  'project' | 'isApiSource' | 'onBack' | 'onRefresh'
> & {
  onOpenProject: () => void;
};

function ProjectDocumentsContent(): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();

  const handleRefresh = async (): Promise<void> => {
    try {
      await onRefresh();
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  };

  return (
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
  );
}

export function ProjectDocumentsPage({
  project,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
}: ProjectDocumentsPageProps): ReactElement {
  return (
    <ProjectDetailShell
      pageContext="documents"
      project={project}
      isApiSource={isApiSource}
      onBack={onBack}
      onOpenProject={onOpenProject}
      onRefresh={onRefresh}
      includeWorkflowModals={false}
    >
      <ProjectDocumentsContent />
    </ProjectDetailShell>
  );
}
