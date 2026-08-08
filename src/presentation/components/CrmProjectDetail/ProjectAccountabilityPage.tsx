'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { shouldUseProductionCrmListV2 } from '@/infrastructure/config/crmDataSource';
import { isProjectsListV2ClientFlagEnabled } from '@/infrastructure/config/projectsListV2Config';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { filterAccountabilityEntriesBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { FolderTabToolbarPortal } from '@/presentation/features/crmProjectDetail/folderTabToolbarContext';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import {
  AccountabilityLogMobileList,
  AccountabilityLogTable,
  sortAccountabilityEntries,
} from './AccountabilityLogTable';
import { ProjectAccountabilityContentV2 } from './ProjectAccountabilityPageV2';
import styles from './ProjectDetail.module.css';

export type ProjectAccountabilityContentProps = {
  /** When true, header actions render in the shared folder tab bar. */
  readonly embeddedInFolderTabs?: boolean;
};

export function ProjectAccountabilityContent({
  embeddedInFolderTabs = false,
}: ProjectAccountabilityContentProps): ReactElement {
  if (shouldUseProductionCrmListV2(isProjectsListV2ClientFlagEnabled())) {
    return <ProjectAccountabilityContentV2 embeddedInFolderTabs={embeddedInFolderTabs} />;
  }
  return <ProjectAccountabilityContentV1 embeddedInFolderTabs={embeddedInFolderTabs} />;
}

function ProjectAccountabilityContentV1({
  embeddedInFolderTabs = false,
}: ProjectAccountabilityContentProps): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();
  const acc = content.projectDetail.accountability;
  const { catalogForProject } = useBuildCorePipelineStages();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const [searchQuery, setSearchQuery] = useState('');
  const isMobileLayout = useDashboardMobileLayout();
  const sectionTitle = content.projectDetail.sections.accountability;
  const entries = useMemo(() => {
    const sorted = sortAccountabilityEntries(project.accountabilityLog);
    return filterAccountabilityEntriesBySearch(sorted, searchQuery, stageCatalog);
  }, [project.accountabilityLog, searchQuery, stageCatalog]);

  const searchInput = (
    <DetailPanelSectionSearch
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={acc.searchPlaceholder}
      ariaLabel={acc.searchAriaLabel}
    />
  );

  const refreshButton = (
    <DetailPanelSectionRefresh
      sectionLabel={sectionTitle}
      onRefresh={onRefresh}
      onError={(message) => setToast({ kind: 'error', message })}
    />
  );

  const headerActions = (
    <DetailPanelHeaderActions>
      {searchInput}
      {refreshButton}
    </DetailPanelHeaderActions>
  );

  return (
    <section
      className={`${styles.workflowPanel} ${styles.accountabilityPagePanel}${
        isMobileLayout ? ` ${styles.accountabilityPagePanel_mobile}` : ''
      }`}
      aria-label={embeddedInFolderTabs ? sectionTitle : undefined}
      aria-labelledby={embeddedInFolderTabs ? undefined : 'project-accountability-heading'}
    >
      {embeddedInFolderTabs ? (
        <FolderTabToolbarPortal>{headerActions}</FolderTabToolbarPortal>
      ) : isMobileLayout ? (
        <div
          className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelHeaderTitleGroup}>
              <h3 id="project-accountability-heading" className={styles.detailPanelTitle}>
                {sectionTitle}
              </h3>
            </div>
          </div>
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
            <div className={styles.detailPanelHeaderRowActions}>{refreshButton}</div>
          </div>
        </div>
      ) : (
        <DetailPanelHeader title={sectionTitle} titleId="project-accountability-heading">
          {headerActions}
        </DetailPanelHeader>
      )}
      {entries.length === 0 ? (
        <p className={styles.subtitle}>{acc.empty}</p>
      ) : isMobileLayout ? (
        <AccountabilityLogMobileList entries={entries} stages={stageCatalog} />
      ) : (
        <div className={styles.detailPanelTableCard}>
          <div className={styles.accountabilityPageTableScroll}>
            <AccountabilityLogTable entries={entries} layout="modal" stages={stageCatalog} />
          </div>
        </div>
      )}
    </section>
  );
}
