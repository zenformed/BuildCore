'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { DocumentPanelFilter } from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { DocumentPanelFilterMenu } from './DocumentPanelFilterMenu';
import { DocumentPanelUploadButton } from './DocumentPanelUploadButton';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsTabPanelProps = {
  readonly className?: string;
  readonly titleId?: string;
  readonly onError?: (message: string) => void;
};

export function ProjectDocumentsTabPanel({
  className = `${styles.paymentsPanel} ${styles.documentsTabPanel}`,
  titleId = 'project-documents-tab-heading',
  onError,
}: ProjectDocumentsTabPanelProps): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();
  const docs = content.projectDetail.documents;
  const isMobileLayout = useDashboardMobileLayout();
  const [filter, setFilter] = useState<DocumentPanelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async (): Promise<void> => {
    try {
      await onRefresh();
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  };

  const handleError = (message: string): void => {
    onError?.(message);
    setToast({ kind: 'error', message });
  };

  const filterMenu = <DocumentPanelFilterMenu filter={filter} onChange={setFilter} />;

  const searchInput = (
    <DetailPanelSectionSearch
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={docs.searchPlaceholder}
      ariaLabel={docs.searchAriaLabel}
    />
  );

  const refreshButton = (
    <DetailPanelSectionRefresh
      sectionLabel={content.projectDetail.sections.documents}
      onRefresh={handleRefresh}
      onError={handleError}
    />
  );

  const uploadButton = (
    <DocumentPanelUploadButton
      projectSlug={project.summary.slug}
      onRefresh={handleRefresh}
      onError={handleError}
    />
  );

  return (
    <section className={className} aria-labelledby={titleId}>
      {isMobileLayout ? (
        <div
          className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelHeaderTitleGroup}>
              <h3 id={titleId} className={styles.detailPanelTitle}>
                {content.projectDetail.sections.documents}
              </h3>
            </div>
            <div className={styles.detailPanelHeaderRowActions}>{filterMenu}</div>
          </div>
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
            <div className={styles.detailPanelHeaderRowActions}>
              {refreshButton}
              {uploadButton}
            </div>
          </div>
        </div>
      ) : (
        <DetailPanelHeader title={content.projectDetail.sections.documents} titleId={titleId}>
          <DetailPanelHeaderActions>
            {filterMenu}
            {searchInput}
            {refreshButton}
            {uploadButton}
          </DetailPanelHeaderActions>
        </DetailPanelHeader>
      )}
      <ProjectDocumentsPanelContent
        project={project}
        filter={filter}
        searchQuery={searchQuery}
        onRefresh={handleRefresh}
        onError={handleError}
      />
    </section>
  );
}
