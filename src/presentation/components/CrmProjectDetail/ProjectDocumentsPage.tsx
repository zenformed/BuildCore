'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
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
      <DetailPanelHeader
        title={content.projectDetail.sections.documents}
        titleId="project-documents-heading"
      >
        <DetailPanelHeaderActions>
          <DetailPanelSectionRefresh
            sectionLabel={content.projectDetail.sections.documents}
            onRefresh={handleRefresh}
            onError={(message) => setToast({ kind: 'error', message })}
          />
        </DetailPanelHeaderActions>
      </DetailPanelHeader>
      <ProjectDocumentsPanelContent
        project={project}
        onRefresh={handleRefresh}
        onError={(message) => setToast({ kind: 'error', message })}
      />
    </section>
  );
}
