'use client';

import { useState, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import styles from './ProjectDetail.module.css';

export function ProjectDocumentsContent(): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();
  const docs = content.projectDetail.documents;
  const [searchQuery, setSearchQuery] = useState('');

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
          <DetailPanelSectionSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={docs.searchPlaceholder}
            ariaLabel={docs.searchAriaLabel}
          />
          <DetailPanelSectionRefresh
            sectionLabel={content.projectDetail.sections.documents}
            onRefresh={handleRefresh}
            onError={(message) => setToast({ kind: 'error', message })}
          />
        </DetailPanelHeaderActions>
      </DetailPanelHeader>
      <ProjectDocumentsPanelContent
        project={project}
        searchQuery={searchQuery}
        onRefresh={handleRefresh}
        onError={(message) => setToast({ kind: 'error', message })}
      />
    </section>
  );
}
