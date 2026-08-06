'use client';

import { useCallback, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useCrmAccountabilityListV2 } from '@/presentation/features/crmProjectDetail/useCrmAccountabilityListV2';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { FolderTabToolbarPortal } from '@/presentation/features/crmProjectDetail/folderTabToolbarContext';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { ListV2InfiniteScrollFooter } from '@/presentation/components/crmShared/ListV2InfiniteScrollFooter';
import {
  AccountabilityLogMobileList,
  AccountabilityLogTable,
} from './AccountabilityLogTable';
import styles from './ProjectDetail.module.css';

export type ProjectAccountabilityContentV2Props = {
  /** When true, header actions render in the shared folder tab bar. */
  readonly embeddedInFolderTabs?: boolean;
};

export function ProjectAccountabilityContentV2({
  embeddedInFolderTabs = false,
}: ProjectAccountabilityContentV2Props): ReactElement {
  const { project, setToast } = useProjectDetailShell();
  const acc = content.projectDetail.accountability;
  const { catalogForProject } = useBuildCorePipelineStages();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const isMobileLayout = useDashboardMobileLayout();
  const sectionTitle = content.projectDetail.sections.accountability;

  const list = useCrmAccountabilityListV2({
    projectSlug: project.summary.slug,
    projectId: project.summary.id,
  });

  const handleRefresh = useCallback(async () => {
    await list.refetch();
  }, [list]);

  const searchInput = (
    <DetailPanelSectionSearch
      value={list.searchInput}
      onChange={list.setSearchInput}
      placeholder={acc.searchPlaceholder}
      ariaLabel={acc.searchAriaLabel}
    />
  );

  const refreshButton = (
    <DetailPanelSectionRefresh
      sectionLabel={sectionTitle}
      onRefresh={handleRefresh}
      onError={(message) => setToast({ kind: 'error', message })}
    />
  );

  const headerActions = (
    <DetailPanelHeaderActions>
      {searchInput}
      {refreshButton}
    </DetailPanelHeaderActions>
  );

  const infiniteScrollFooter = (
    <ListV2InfiniteScrollFooter
      hasNextPage={list.hasNextPage}
      isFetchingNextPage={list.isFetchingNextPage}
      onFetchNextPage={list.loadMore}
      loadingLabel={acc.loadingMore}
      loadMoreLabel={acc.loadMore}
    />
  );

  const body = (() => {
    if (list.isLoading) {
      return <p className={styles.subtitle}>{acc.loading}</p>;
    }
    if (list.errorMessage != null) {
      return <p className={styles.subtitle}>{list.errorMessage}</p>;
    }
    if (list.entries.length === 0) {
      return <p className={styles.subtitle}>{acc.empty}</p>;
    }
    if (isMobileLayout) {
      return (
        <>
          <AccountabilityLogMobileList entries={list.entries} stages={stageCatalog} />
          {infiniteScrollFooter}
        </>
      );
    }
    return (
      <div className={styles.detailPanelTableCard}>
        <div className={styles.accountabilityPageTableScroll}>
          <AccountabilityLogTable entries={list.entries} layout="modal" stages={stageCatalog} />
        </div>
        {infiniteScrollFooter}
      </div>
    );
  })();

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
      {list.showNewActivityBanner ? (
        <div className={styles.accountabilityNewActivityBanner} role="status">
          <span>{acc.newActivityAvailable}</span>
          <button
            type="button"
            className={styles.accountabilityNewActivityRefresh}
            onClick={() => {
              void list.refreshToNewest().catch((err: unknown) => {
                const message =
                  err instanceof Error ? err.message : 'Could not refresh Accountability';
                setToast({ kind: 'error', message });
              });
            }}
          >
            {acc.newActivityRefresh}
          </button>
        </div>
      ) : null}
      {body}
    </section>
  );
}
