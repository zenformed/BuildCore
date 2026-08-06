'use client';

import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { isDocumentsListV2ClientFlagEnabled } from '@/infrastructure/config/documentsListV2Config';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ProjectDocumentsTabPanelV2 } from './ProjectDocumentsTabPanelV2';
import {
  buildDocumentPanelSourcesFromProject,
  filterDocumentPanelItems,
  type DocumentPanelFilter,
} from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { filterDocumentPanelItemsBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
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
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsTabPanelProps = {
  readonly className?: string;
  readonly titleId?: string;
  readonly onError?: (message: string) => void;
  /** When true, header actions render in the shared folder tab bar. */
  readonly embeddedInFolderTabs?: boolean;
};

export function ProjectDocumentsTabPanel({
  className = `${styles.paymentsPanel} ${styles.documentsTabPanel}`,
  titleId = 'project-documents-tab-heading',
  onError,
  embeddedInFolderTabs = false,
}: ProjectDocumentsTabPanelProps): ReactElement {
  if (isDocumentsListV2ClientFlagEnabled()) {
    return (
      <ProjectDocumentsTabPanelV2
        className={className}
        titleId={titleId}
        onError={onError}
        embeddedInFolderTabs={embeddedInFolderTabs}
      />
    );
  }
  return (
    <ProjectDocumentsTabPanelV1
      className={className}
      titleId={titleId}
      onError={onError}
      embeddedInFolderTabs={embeddedInFolderTabs}
    />
  );
}

function ProjectDocumentsTabPanelV1({
  className = `${styles.paymentsPanel} ${styles.documentsTabPanel}`,
  titleId = 'project-documents-tab-heading',
  onError,
  embeddedInFolderTabs = false,
}: ProjectDocumentsTabPanelProps): ReactElement {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<DocumentsViewMode>(() => readDocumentsViewMode());

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

  const items = useMemo(() => {
    const byFilter = filterDocumentPanelItems(
      buildDocumentPanelSourcesFromProject(project),
      filter
    );
    return filterDocumentPanelItemsBySearch(byFilter, searchQuery, stageCatalog);
  }, [filter, project, searchQuery, stageCatalog]);

  const visibleDocuments = useMemo(
    () =>
      items
        .filter((item): item is { kind: 'document'; document: CrmDocumentMetadata } =>
          item.kind === 'document'
        )
        .map((item) => item.document),
    [items]
  );

  const visibleDocumentIds = useMemo(
    () => visibleDocuments.map((doc) => doc.id),
    [visibleDocuments]
  );

  const documentsById = useMemo(() => {
    const map = new Map<string, CrmDocumentMetadata>();
    for (const doc of visibleDocuments) {
      map.set(doc.id, doc);
    }
    return map;
  }, [visibleDocuments]);

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
        await downloadCrmProjectDocumentsBulk(project.summary.slug, documentIds);
      },
      onDeleteDocuments: async (documentIds) => {
        const docsToDelete: CrmDocumentMetadata[] = [];
        for (const documentId of documentIds) {
          const doc =
            documentsById.get(documentId) ?? project.documents.find((d) => d.id === documentId);
          if (doc != null) docsToDelete.push(doc);
        }
        if (docsToDelete.length === 0) {
          return { deletedCount: 0, failedCount: documentIds.length };
        }

        const idSet = new Set(docsToDelete.map((doc) => doc.id));
        // Remove all selected tiles immediately; delete continues in parallel.
        onDocumentsDeleted([...idSet]);
        clearApiCrmDetailCache();

        const { deletedCount, failedCount } = await deleteCrmProjectDocumentsBulk(
          crmRepositories,
          project.summary.slug,
          docsToDelete
        );

        if (failedCount > 0) {
          // Reconcile UI with server if any deletes failed.
          try {
            await onRefresh();
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
      onDocumentsDeleted,
      onRefresh,
      project.documents,
      project.summary.slug,
      projectMutationsLocked,
      setToast,
    ]
  );

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
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={docs.searchPlaceholder}
        aria-label={docs.searchAriaLabel}
        className={`${styles.subprojectsSearch} ${styles.subprojectsSearch_withIcon}`}
      />
    </div>
  ) : (
    <DetailPanelSectionSearch
      value={searchQuery}
      onChange={setSearchQuery}
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

  return (
    <DocumentRowSelectionProvider
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
        {isMobileLayout ? (
          <>
            <DocumentsMobileSelectedFloatingPill />
            <DocumentsMobileHideWhenBulkActive>{mobileFloatingAddButton}</DocumentsMobileHideWhenBulkActive>
          </>
        ) : null}
        {viewMode === 'gallery' ? (
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
              resolveProjectSlug={() => project.summary.slug}
              resolveProjectLabel={() => projectLabel}
              resolveTaskTitle={resolveTaskTitle}
              onDownloadDocument={previewActions.downloadDocument}
              onDeleteDocument={previewActions.deleteDocument}
              canDeleteDocument={() => !projectMutationsLocked}
            />
          </>
        ) : (
          <ProjectDocumentsPanelContent
            project={project}
            filter={filter}
            searchQuery={searchQuery}
            leadingFilter={listLeadingFilter}
            onRefresh={handleRefresh}
            onError={handleError}
            showStatusRefresh={listShowStatusRefresh}
          />
        )}
      </section>
    </DocumentRowSelectionProvider>
  );
}
