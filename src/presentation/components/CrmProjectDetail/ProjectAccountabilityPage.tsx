'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { filterAccountabilityEntriesBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import {
  AccountabilityLogMobileList,
  AccountabilityLogTable,
  sortAccountabilityEntries,
} from './AccountabilityLogTable';
import styles from './ProjectDetail.module.css';

export function ProjectAccountabilityContent(): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();
  const acc = content.projectDetail.accountability;
  const { catalogForProject } = useBuildCorePipelineStages();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const [searchQuery, setSearchQuery] = useState('');
  const isMobileLayout = useDashboardMobileLayout();
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
      sectionLabel={content.projectDetail.sections.accountability}
      onRefresh={onRefresh}
      onError={(message) => setToast({ kind: 'error', message })}
    />
  );

  return (
    <section
      className={`${styles.workflowPanel} ${styles.accountabilityPagePanel}${
        isMobileLayout ? ` ${styles.accountabilityPagePanel_mobile}` : ''
      }`}
      aria-labelledby="project-accountability-heading"
    >
      {isMobileLayout ? (
        <div
          className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelHeaderTitleGroup}>
              <h3 id="project-accountability-heading" className={styles.detailPanelTitle}>
                {content.projectDetail.sections.accountability}
              </h3>
            </div>
          </div>
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
            <div className={styles.detailPanelHeaderRowActions}>{refreshButton}</div>
          </div>
        </div>
      ) : (
        <DetailPanelHeader
          title={content.projectDetail.sections.accountability}
          titleId="project-accountability-heading"
        >
          <DetailPanelHeaderActions>
            {searchInput}
            {refreshButton}
          </DetailPanelHeaderActions>
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
