'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import styles from './ProjectDetail.module.css';

export function ProjectDocumentsContent(): ReactElement {
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
