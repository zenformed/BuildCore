'use client';

import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import type { CrmDocumentMetadata } from '@/domain/crm';
import {
  CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS,
  type CrmDocumentListItemV2,
} from '@/domain/crm/documentsListV2';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { DocumentPanelFilter } from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { buildCrmDocumentsListV2PanelItems } from '@/presentation/features/crmProjectDetail/documentsListV2PanelItems';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useCrmDocumentsListV2 } from '@/presentation/features/crmProjectDetail/useCrmDocumentsListV2';
import { useProjectDocumentModalActions } from '@/presentation/features/crmProjectDetail/useProjectDocumentModalActions';
import { deleteCrmProjectDocumentsBulk } from '@/presentation/features/crmProjectDetail/deleteCrmProjectDocumentsBulk';
import { downloadCrmProjectDocumentsBulk } from '@/presentation/features/crmProjectDetail/downloadCrmProjectDocumentsBulk';
import {
  DocumentRowSelectionProvider,
  type DocumentRowSelectionBulkActions,
} from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import { clearApiCrmDetailCache } from '@/infrastructure/crm/api/apiCrmDetailCache';
import { crmRepositories } from '@/shared/di/container';
import {
  readDocumentsViewMode,
  writeDocumentsViewMode,
  type DocumentsViewMode,
} from '@/presentation/features/crmProjectDetail/documentsViewStorage';
import { formatWorkflowTaskStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { resolveCrmDocumentDownloadPermissionDomain } from '@/presentation/features/crmProjectDetail/crmDocumentDownloadPermission';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderMoreMenu } from './DetailPanelHeaderMoreMenu';
import { FolderTabToolbarPortal } from '@/presentation/features/crmProjectDetail/folderTabToolbarContext';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { DocumentPanelFilterMenu } from './DocumentPanelFilterMenu';
import { DocumentPanelUploadButton } from './DocumentPanelUploadButton';
import projectsStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import { DocumentsGallery } from './DocumentsGallery';
import { DocumentsListHeaderRow } from './DocumentsListHeaderRow';
import { DocumentsViewToggleButton } from './DocumentsViewToggleButton';
import {
  DocumentsMobileHideWhenBulkActive,
  DocumentsMobileSearchToolsRow,
  DocumentsMobileSelectedFloatingPill,
} from './MobileBulkSelectionChrome';
import { DocumentsListV2InfiniteScrollFooter } from './DocumentsListV2InfiniteScrollFooter';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsTabPanelV2Props = {
  readonly className?: string;
  readonly titleId?: string;
  readonly onError?: (message: string) => void;
  readonly embeddedInFolderTabs?: boolean;
};

function assertBulkIdLimit(documentIds: readonly string[]): void {
  if (documentIds.length > CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS) {
    throw new Error(`Select at most ${CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS} documents`);
  }
}

export function ProjectDocumentsTabPanelV2({
  className = `${styles.paymentsPanel} ${styles.documentsTabPanel}`,
  titleId = 'project-documents-tab-heading',
  onError,
  embeddedInFolderTabs = false,
}: ProjectDocumentsTabPanelV2Props): ReactElement {
  const {
    project,
    parentProject,
    onRefresh,
    onDocumentsDeleted,
    setToast,
    projectMutationsLocked,
    guardProjectEdit,
  } = useProjectDetailShell();
  const docs = content.projectDetail.documents;
  const isMobileLayout = useDashboardMobileLayout();
  const { catalogForProject } = useBuildCorePipelineStages();
  const workflowAccess = useBuildCoreWorkflowTaskAccess();
  const sectionAccess = useBuildCoreProjectSectionAccess();
  const stageCatalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const [filter, setFilter] = useState<DocumentPanelFilter>('all');
  const [viewMode, setViewMode] = useState<DocumentsViewMode>(() => readDocumentsViewMode());

  const list = useCrmDocumentsListV2({
    projectSlug: project.summary.slug,
    projectId: project.summary.id,
  });

  const handleListRefresh = useCallback(async (): Promise<void> => {
    await list.refetch();
  }, [list]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([onRefresh(), handleListRefresh()]);
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  }, [handleListRefresh, onRefresh, setToast]);

  const handleError = (message: string): void => {
    onError?.(message);
    setToast({ kind: 'error', message });
  };

  const handleToggleViewMode = (): void => {
    setViewMode((previous) => {
      const next: DocumentsViewMode = previous === 'list' ? 'gallery' : 'list';
      writeDocumentsViewMode(next);
      return next;
    });
  };

  const previewActions = useProjectDocumentModalActions({
    projectSlug: project.summary.slug,
    onChanged: handleRefresh,
    onError: handleError,
    onDemoDownloadBlocked: (message) => setToast({ kind: 'success', message }),
  });

  const items = useMemo(
    () =>
      buildCrmDocumentsListV2PanelItems({
        project,
        paginatedDocuments: list.documents,
        filter,
        searchQuery: list.debouncedSearch,
        stageCatalog,
      }),
    [filter, list.debouncedSearch, list.documents, project, stageCatalog]
  );

  const visibleDocuments = useMemo(
    () =>
      items
        .filter(
          (item): item is { kind: 'document'; document: CrmDocumentListItemV2 } =>
            item.kind === 'document'
        )
        .map((item) => item.document),
    [items]
  );

  const thumbnailUrlByDocumentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const doc of visibleDocuments) {
      const url = doc.thumbnailUrl?.trim();
      if (url) map.set(doc.id, url);
    }
    return map;
  }, [visibleDocuments]);

  const visibleDocumentIds = useMemo(
    () => visibleDocuments.map((doc) => doc.id),
    [visibleDocuments]
  );

  const documentsById = useMemo(() => {
    const map = new Map<string, CrmDocumentMetadata>();
    for (const doc of list.documents) {
      map.set(doc.id, doc);
    }
    return map;
  }, [list.documents]);

  const taskById = useMemo(
    () => new Map(project.workflowTasks.map((task) => [task.id, task] as const)),
    [project.workflowTasks]
  );

  const projectLabel = useMemo(() => {
    if (parentProject != null) {
      return `${parentProject.name} / ${project.summary.name}`;
    }
    return project.summary.name;
  }, [parentProject, project.summary.name]);

  const resolveTaskTitle = useCallback(
    (doc: CrmDocumentMetadata): string => {
      if (doc.workflowTaskId == null) return docs.gallery.metadata.noTask;
      const task = taskById.get(doc.workflowTaskId);
      if (task) return task.title;
      if (doc.stageSlug == null) return docs.gallery.metadata.noTask;
      return formatWorkflowTaskStageLabel(
        { stageSlug: doc.stageSlug, amountCents: null },
        stageCatalog
      );
    },
    [docs.gallery.metadata.noTask, stageCatalog, taskById]
  );

  const canDownloadDoc = useCallback(
    (doc: CrmDocumentMetadata): boolean => {
      const domain = resolveCrmDocumentDownloadPermissionDomain(
        doc,
        doc.workflowTaskId ? taskById.get(doc.workflowTaskId) : undefined
      );
      if (domain == null) return true;
      if (domain === 'workflow_tasks') {
        return workflowAccess.isReady && workflowAccess.permissions.canDownload;
      }
      if (domain === 'payments') {
        return sectionAccess.payment.isReady && sectionAccess.payment.permissions.canDownload;
      }
      return sectionAccess.budget.isReady && sectionAccess.budget.permissions.canDownload;
    },
    [sectionAccess.budget, sectionAccess.payment, taskById, workflowAccess]
  );

  const downloadableDocumentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const doc of visibleDocuments) {
      if (canDownloadDoc(doc)) ids.add(doc.id);
    }
    return ids;
  }, [canDownloadDoc, visibleDocuments]);

  const selectionBulkActions = useMemo<DocumentRowSelectionBulkActions>(
    () => ({
      canDownload: downloadableDocumentIds.size > 0,
      canDelete: !projectMutationsLocked,
      downloadableDocumentIds,
      documentsById,
      onDownloadDocuments: async (documentIds) => {
        assertBulkIdLimit(documentIds);
        await downloadCrmProjectDocumentsBulk(project.summary.slug, documentIds);
      },
      onDeleteDocuments: async (documentIds) => {
        assertBulkIdLimit(documentIds);
        const docsToDelete: CrmDocumentMetadata[] = [];
        for (const documentId of documentIds) {
          const doc = documentsById.get(documentId);
          if (doc != null) docsToDelete.push(doc);
        }
        if (docsToDelete.length === 0) {
          return { deletedCount: 0, failedCount: documentIds.length };
        }

        const idSet = new Set(docsToDelete.map((doc) => doc.id));
        onDocumentsDeleted([...idSet]);
        list.removeDocumentsLocally([...idSet]);
        clearApiCrmDetailCache();

        const { deletedCount, failedCount } = await deleteCrmProjectDocumentsBulk(
          crmRepositories,
          project.summary.slug,
          docsToDelete
        );

        if (failedCount > 0) {
          try {
            await handleRefresh();
          } catch {
            // Keep optimistic state; toast still reports partial failure.
          }
        }

        return {
          deletedCount,
          failedCount: failedCount + (documentIds.length - docsToDelete.length),
        };
      },
      onFeedback: setToast,
      guardDelete: guardProjectEdit,
    }),
    [
      documentsById,
      downloadableDocumentIds,
      guardProjectEdit,
      handleRefresh,
      list,
      onDocumentsDeleted,
      project.summary.slug,
      projectMutationsLocked,
      setToast,
    ]
  );

  const selectionResetKey = `${list.searchFingerprintKey}|${filter}`;

  const filterCaret = (
    <DocumentPanelFilterMenu
      filter={filter}
      onChange={setFilter}
      triggerVariant="caret"
      menuAlign="start"
    />
  );

  const filterGhost = (
    <DocumentPanelFilterMenu
      filter={filter}
      onChange={setFilter}
      triggerVariant="ghost"
      menuAlign="end"
    />
  );

  const viewToggle = (
    <DocumentsViewToggleButton
      viewMode={viewMode}
      onToggle={handleToggleViewMode}
      variant="ghost"
    />
  );

  const searchInput = isMobileLayout ? (
    <div className={styles.subprojectsSearchFieldWrap}>
      <LuSearch className={styles.subprojectsSearchIcon} size={14} strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={list.searchInput}
        onChange={(event) => list.setSearchInput(event.target.value)}
        placeholder={docs.searchPlaceholder}
        aria-label={docs.searchAriaLabel}
        className={`${styles.subprojectsSearch} ${styles.subprojectsSearch_withIcon}`}
      />
    </div>
  ) : (
    <DetailPanelSectionSearch
      value={list.searchInput}
      onChange={list.setSearchInput}
      placeholder={docs.searchPlaceholder}
      ariaLabel={docs.searchAriaLabel}
    />
  );

  const uploadButton = (
    <DocumentPanelUploadButton
      projectSlug={project.summary.slug}
      onRefresh={handleRefresh}
      onError={handleError}
    />
  );
  const desktopMoreMenu = !isMobileLayout ? (
    <DetailPanelHeaderMoreMenu
      refreshAction={{
        sectionLabel: content.projectDetail.sections.documents,
        onRefresh: handleRefresh,
        onError: handleError,
      }}
    />
  ) : null;
  const desktopCreateActions = (
    <div className={projectsStyles.desktopCreateActions}>
      {uploadButton}
      {desktopMoreMenu}
    </div>
  );
  const mobileFloatingAddButton = (
    <DocumentPanelUploadButton
      projectSlug={project.summary.slug}
      onRefresh={handleRefresh}
      onError={handleError}
      floatingLabel="+ Add Documents"
      floatingClassName={styles.subprojectsMobileCreateFloatingBtn}
    />
  );
  const mobileSearchTrailingActions = (
    <div className={styles.workflowMobileSearchActions}>
      {filterGhost}
      {viewToggle}
    </div>
  );
  const mobileHeaderContent = (
    <DocumentsMobileSearchToolsRow
      searchInput={searchInput}
      trailingActions={mobileSearchTrailingActions}
    />
  );

  const listLeadingFilter = embeddedInFolderTabs ? null : filterCaret;
  const listShowStatusRefresh = !embeddedInFolderTabs;

  const infiniteScrollFooter = (
    <DocumentsListV2InfiniteScrollFooter
      enabled={filter !== 'missing'}
      hasNextPage={list.hasNextPage}
      isFetchingNextPage={list.isFetchingNextPage}
      onFetchNextPage={list.loadMore}
      loadingLabel={docs.loadingMore}
      loadMoreLabel={docs.loadMore}
    />
  );

  const body = (() => {
    if (list.isLoading && filter !== 'missing') {
      return <p className={styles.subtitle}>{docs.loading}</p>;
    }
    if (list.errorMessage != null && filter !== 'missing') {
      return <p className={styles.subtitle}>{list.errorMessage}</p>;
    }
    if (viewMode === 'gallery') {
      return (
        <>
          {visibleDocuments.length > 0 && !isMobileLayout ? (
            <DocumentsListHeaderRow
              leadingFilter={listLeadingFilter}
              onRefresh={handleRefresh}
              onError={handleError}
              showStatusRefresh={listShowStatusRefresh}
            />
          ) : null}
          <DocumentsGallery
            documents={visibleDocuments}
            thumbnailUrlByDocumentId={thumbnailUrlByDocumentId}
            resolveProjectSlug={() => project.summary.slug}
            resolveProjectLabel={() => projectLabel}
            resolveTaskTitle={resolveTaskTitle}
            onDownloadDocument={previewActions.downloadDocument}
            onDeleteDocument={previewActions.deleteDocument}
            canDeleteDocument={() => !projectMutationsLocked}
          />
          {infiniteScrollFooter}
        </>
      );
    }
    return (
      <>
        <ProjectDocumentsPanelContent
          project={project}
          filter={filter}
          searchQuery={list.debouncedSearch}
          itemsOverride={items}
          leadingFilter={listLeadingFilter}
          onRefresh={handleRefresh}
          onError={handleError}
          showStatusRefresh={listShowStatusRefresh}
        />
        {infiniteScrollFooter}
      </>
    );
  })();

  return (
    <DocumentRowSelectionProvider
      key={selectionResetKey}
      visibleDocumentIds={visibleDocumentIds}
      bulkActions={selectionBulkActions}
    >
      <section
        className={className}
        aria-label={
          embeddedInFolderTabs ? content.projectDetail.sections.documents : undefined
        }
        aria-labelledby={embeddedInFolderTabs ? undefined : titleId}
      >
        {isMobileLayout && embeddedInFolderTabs ? (
          <FolderTabToolbarPortal>
            <div className={styles.workflowFolderToolbar}>{mobileHeaderContent}</div>
          </FolderTabToolbarPortal>
        ) : embeddedInFolderTabs ? (
          <FolderTabToolbarPortal>
            <DetailPanelHeaderActions>
              {filterGhost}
              {viewToggle}
              {searchInput}
              {desktopCreateActions}
            </DetailPanelHeaderActions>
          </FolderTabToolbarPortal>
        ) : isMobileLayout ? (
          <div
            className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
              .filter(Boolean)
              .join(' ')}
          >
            {mobileHeaderContent}
          </div>
        ) : (
          <DetailPanelHeader title={content.projectDetail.sections.documents} titleId={titleId}>
            <DetailPanelHeaderActions>
              {viewToggle}
              {searchInput}
              {desktopCreateActions}
            </DetailPanelHeaderActions>
          </DetailPanelHeader>
        )}
        {list.showNewDocumentsBanner ? (
          <div className={styles.documentsNewActivityBanner} role="status">
            <span>{docs.newDocumentsAvailable}</span>
            <button
              type="button"
              className={styles.documentsNewActivityRefresh}
              onClick={() => {
                void list.refreshToNewest().catch((err: unknown) => {
                  const message =
                    err instanceof Error ? err.message : 'Could not refresh Documents';
                  setToast({ kind: 'error', message });
                });
              }}
            >
              {docs.newDocumentsRefresh}
            </button>
          </div>
        ) : null}
        {isMobileLayout ? (
          <>
            <DocumentsMobileSelectedFloatingPill />
            <DocumentsMobileHideWhenBulkActive>
              {mobileFloatingAddButton}
            </DocumentsMobileHideWhenBulkActive>
          </>
        ) : null}
        {body}
      </section>
    </DocumentRowSelectionProvider>
  );
}
