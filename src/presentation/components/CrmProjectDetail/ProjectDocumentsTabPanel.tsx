'use client';

import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildDocumentPanelSourcesFromProject,
  filterDocumentPanelItems,
  type DocumentPanelFilter,
} from '@/presentation/features/crmProjectDetail/documentPanelModel';
import { filterDocumentPanelItemsBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useProjectDocumentModalActions } from '@/presentation/features/crmProjectDetail/useProjectDocumentModalActions';
import {
  DocumentRowSelectionProvider,
  type DocumentRowSelectionBulkActions,
} from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
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
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { DocumentPanelFilterMenu } from './DocumentPanelFilterMenu';
import { DocumentPanelUploadButton } from './DocumentPanelUploadButton';
import { DocumentsGallery } from './DocumentsGallery';
import { DocumentsListHeaderRow } from './DocumentsListHeaderRow';
import { DocumentsViewToggleButton } from './DocumentsViewToggleButton';
import {
  DocumentsMobileBulkSelectAllRow,
  DocumentsMobileBulkToolbar,
  DocumentsMobileSearchToolsRow,
} from './MobileBulkSelectionChrome';
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
  const {
    project,
    parentProject,
    onRefresh,
    setToast,
    projectMutationsLocked,
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

  const { deleteDocument } = useProjectDocumentModalActions({
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
      onDeleteDocuments: async (documentIds) => {
        let deletedCount = 0;
        let failedCount = 0;
        for (const documentId of documentIds) {
          const doc =
            documentsById.get(documentId) ?? project.documents.find((d) => d.id === documentId);
          if (doc == null) {
            failedCount += 1;
            continue;
          }
          try {
            await deleteDocument(doc);
            deletedCount += 1;
          } catch {
            failedCount += 1;
          }
        }
        return { deletedCount, failedCount };
      },
    }),
    [
      deleteDocument,
      documentsById,
      downloadableDocumentIds,
      project.documents,
      projectMutationsLocked,
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

  const viewToggle = (
    <DocumentsViewToggleButton viewMode={viewMode} onToggle={handleToggleViewMode} />
  );

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
    <DocumentRowSelectionProvider
      visibleDocumentIds={visibleDocumentIds}
      bulkActions={selectionBulkActions}
    >
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
                {filterCaret}
              </div>
              <div className={styles.detailPanelHeaderRowActions}>
                {refreshButton}
                <DocumentsMobileBulkToolbar />
              </div>
            </div>
            <DocumentsMobileSearchToolsRow
              leadingActions={viewToggle}
              searchInput={searchInput}
              trailingActions={uploadButton}
            />
          </div>
        ) : (
          <DetailPanelHeader title={content.projectDetail.sections.documents} titleId={titleId}>
            <DetailPanelHeaderActions>
              {viewToggle}
              {searchInput}
              {uploadButton}
            </DetailPanelHeaderActions>
          </DetailPanelHeader>
        )}
        {viewMode === 'gallery' ? (
          <>
            {visibleDocuments.length > 0 && isMobileLayout ? (
              <DocumentsMobileBulkSelectAllRow />
            ) : null}
            {visibleDocuments.length > 0 && !isMobileLayout ? (
              <DocumentsListHeaderRow
                leadingFilter={filterCaret}
                onRefresh={handleRefresh}
                onError={handleError}
              />
            ) : null}
            <DocumentsGallery
              project={project}
              documents={visibleDocuments}
              projectLabel={projectLabel}
              resolveTaskTitle={resolveTaskTitle}
            />
          </>
        ) : (
          <ProjectDocumentsPanelContent
            project={project}
            filter={filter}
            searchQuery={searchQuery}
            leadingFilter={filterCaret}
            onRefresh={handleRefresh}
            onError={handleError}
          />
        )}
      </section>
    </DocumentRowSelectionProvider>
  );
}
