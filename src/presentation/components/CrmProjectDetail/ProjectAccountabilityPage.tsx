'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { filterAccountabilityEntriesBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { AccountabilityLogTable, sortAccountabilityEntries } from './AccountabilityLogTable';
import styles from './ProjectDetail.module.css';

export function ProjectAccountabilityContent(): ReactElement {
  const { project, onRefresh, setToast } = useProjectDetailShell();
  const acc = content.projectDetail.accountability;
  const { catalogForProject } = useBuildCorePipelineStages();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const [searchQuery, setSearchQuery] = useState('');
  const entries = useMemo(() => {
    const sorted = sortAccountabilityEntries(project.accountabilityLog);
    return filterAccountabilityEntriesBySearch(sorted, searchQuery, stageCatalog);
  }, [project.accountabilityLog, searchQuery, stageCatalog]);

  return (
    <section
      className={`${styles.workflowPanel} ${styles.accountabilityPagePanel}`}
      aria-labelledby="project-accountability-heading"
    >
      <DetailPanelHeader
        title={content.projectDetail.sections.accountability}
        titleId="project-accountability-heading"
      >
        <DetailPanelHeaderActions>
          <DetailPanelSectionSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={acc.searchPlaceholder}
            ariaLabel={acc.searchAriaLabel}
          />
          <DetailPanelSectionRefresh
            sectionLabel={content.projectDetail.sections.accountability}
            onRefresh={onRefresh}
            onError={(message) => setToast({ kind: 'error', message })}
          />
        </DetailPanelHeaderActions>
      </DetailPanelHeader>
      {entries.length === 0 ? (
        <p className={styles.subtitle}>{acc.empty}</p>
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
