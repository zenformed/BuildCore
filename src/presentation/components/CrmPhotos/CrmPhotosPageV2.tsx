'use client';

/**
 * Photos list v2 — signed cursors, SQL visibility/search, shared infinite scroll.
 */

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { CRM_PHOTOS_LIST_V2_BULK_MAX_IDS } from '@/domain/crm/photosListV2';
import { crmRepositories } from '@/shared/di/container';
import {
  crmProjectDocumentDownloadTargetFromMetadata,
  downloadCrmProjectDocument,
} from '@/presentation/features/crmProjectDetail/downloadCrmProjectDocument';
import {
  DocumentRowSelectionProvider,
  type DocumentRowSelectionBulkActions,
} from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import { DocumentsGallery } from '@/presentation/components/CrmProjectDetail/DocumentsGallery';
import { DocumentsPanelBulkActions } from '@/presentation/components/CrmProjectDetail/DocumentsPanelBulkActions';
import { DetailPanelSectionSearch } from '@/presentation/components/CrmProjectDetail/DetailPanelSectionSearch';
import { DetailToast } from '@/presentation/components/CrmProjectDetail/DetailToast';
import { ListV2InfiniteScrollFooter } from '@/presentation/components/crmShared/ListV2InfiniteScrollFooter';
import { downloadCrmOrganizationPhotos } from '@/presentation/features/crmPhotos/downloadCrmOrganizationPhotos';
import { deleteCrmOrganizationPhotos } from '@/presentation/features/crmPhotos/deleteCrmOrganizationPhotos';
import { useCrmPhotosListV2 } from '@/presentation/features/crmPhotos/useCrmPhotosListV2';
import projectStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmPhotos.module.css';

function assertBulkIdLimit(documentIds: readonly string[]): void {
  if (documentIds.length > CRM_PHOTOS_LIST_V2_BULK_MAX_IDS) {
    throw new Error(`Select at most ${CRM_PHOTOS_LIST_V2_BULK_MAX_IDS} photos`);
  }
}

export function CrmPhotosPageV2(): ReactElement {
  const list = useCrmPhotosListV2();
  const [toast, setToast] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);

  const photoByDocumentId = useMemo(
    () => new Map(list.photos.map((photo) => [photo.id, photo] as const)),
    [list.photos]
  );
  const documents = useMemo(
    () => list.photos.map((photo) => photo.document),
    [list.photos]
  );
  const thumbnailUrlByDocumentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const photo of list.photos) {
      const url = photo.thumbnailUrl?.trim();
      if (url) map.set(photo.id, url);
    }
    return map;
  }, [list.photos]);
  const documentById = useMemo(
    () => new Map(documents.map((document) => [document.id, document] as const)),
    [documents]
  );
  const downloadableIds = useMemo(
    () =>
      new Set(list.photos.filter((photo) => photo.canDownload).map((photo) => photo.id)),
    [list.photos]
  );
  const deletableIds = useMemo(
    () => new Set(list.photos.filter((photo) => photo.canDelete).map((photo) => photo.id)),
    [list.photos]
  );

  const bulkActions = useMemo<DocumentRowSelectionBulkActions>(
    () => ({
      canDownload: downloadableIds.size > 0,
      canDelete: deletableIds.size > 0,
      downloadableDocumentIds: downloadableIds,
      deletableDocumentIds: deletableIds,
      documentsById: documentById,
      onDownloadDocuments: async (ids) => {
        assertBulkIdLimit(ids);
        await downloadCrmOrganizationPhotos(ids);
      },
      onDeleteDocuments: async (ids) => {
        assertBulkIdLimit(ids);
        list.removePhotosLocally(ids);
        try {
          const result = await deleteCrmOrganizationPhotos(ids);
          if (result.failedCount > 0) await list.refetch();
          return result;
        } catch (err) {
          await list.refetch();
          throw err;
        }
      },
      onFeedback: setToast,
      guardDelete: (action) => action(),
    }),
    [deletableIds, documentById, downloadableIds, list]
  );

  const resolvePhoto = useCallback(
    (document: CrmDocumentMetadata) => photoByDocumentId.get(document.id),
    [photoByDocumentId]
  );
  const resolveProjectLabel = useCallback(
    (document: CrmDocumentMetadata) => {
      const photo = resolvePhoto(document);
      if (!photo) return '—';
      return photo.parentProjectName
        ? `${photo.parentProjectName} / ${photo.projectName}`
        : photo.projectName;
    },
    [resolvePhoto]
  );
  const handleSingleDownload = useCallback(
    async (document: CrmDocumentMetadata) => {
      const photo = resolvePhoto(document);
      if (!photo?.canDownload) throw new Error('You cannot download this photo.');
      try {
        await downloadCrmProjectDocument(
          crmRepositories,
          crmProjectDocumentDownloadTargetFromMetadata(photo.projectSlug, document)
        );
      } catch (error) {
        setToast({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Could not download photo.',
        });
        throw error;
      }
    },
    [resolvePhoto]
  );
  const handleSingleDelete = useCallback(
    async (document: CrmDocumentMetadata) => {
      const photo = resolvePhoto(document);
      if (!photo?.canDelete) throw new Error('You cannot delete this photo.');
      list.removePhotosLocally([document.id]);
      try {
        await deleteCrmOrganizationPhotos([document.id]);
        setToast({ kind: 'success', message: 'Photo deleted.' });
      } catch (err) {
        await list.refetch();
        setToast({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not delete photo.',
        });
        throw err;
      }
    },
    [list, resolvePhoto]
  );

  const searchActive = list.debouncedSearch.trim().length > 0;

  return (
    <div className={styles.pageShell} data-crm-photos-page data-crm-photos-list="v2">
      {toast ? (
        <DetailToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <DocumentRowSelectionProvider
        key={list.searchFingerprintKey}
        visibleDocumentIds={documents.map((document) => document.id)}
        bulkActions={bulkActions}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={projectStyles.titleBlock}>
              <nav className={projectStyles.breadcrumb} aria-label="Breadcrumb">
                <span className={projectStyles.breadcrumbMuted}>CRM Reports</span>
                <span className={projectStyles.breadcrumbSep} aria-hidden>
                  /
                </span>
                <span className={projectStyles.breadcrumbCurrent}>Photos</span>
              </nav>
              <h1 className={projectStyles.title}>Photos</h1>
            </div>
          </div>
          <div className={styles.headerSearch}>
            <DetailPanelSectionSearch
              value={list.searchInput}
              onChange={list.setSearchInput}
              placeholder="Search photos…"
              ariaLabel="Search organization photos"
              className={styles.searchInput}
            />
          </div>
          <div className={styles.headerActions}>
            <DocumentsPanelBulkActions />
          </div>
        </header>

        {list.showNewPhotosBanner ? (
          <div className={styles.newPhotosBanner} role="status">
            <span>New photos available</span>
            <button
              type="button"
              className={styles.newPhotosRefresh}
              onClick={() => {
                void list.refreshToNewest().catch((err: unknown) => {
                  setToast({
                    kind: 'error',
                    message:
                      err instanceof Error ? err.message : 'Could not refresh Photos',
                  });
                });
              }}
            >
              Refresh
            </button>
          </div>
        ) : null}

        <main className={styles.content}>
          {list.isLoading ? <p className={styles.state}>Loading photos…</p> : null}
          {!list.isLoading && list.errorMessage ? (
            <p className={styles.error}>{list.errorMessage}</p>
          ) : null}
          {!list.isLoading && !list.errorMessage ? (
            <DocumentsGallery
              documents={documents}
              thumbnailUrlByDocumentId={thumbnailUrlByDocumentId}
              resolveProjectSlug={(document) =>
                resolvePhoto(document)?.projectSlug ?? ''
              }
              resolveProjectLabel={resolveProjectLabel}
              resolveTaskTitle={(document) => resolvePhoto(document)?.taskName ?? '—'}
              onDownloadDocument={handleSingleDownload}
              onDeleteDocument={handleSingleDelete}
              canDeleteDocument={(document) => resolvePhoto(document)?.canDelete === true}
              emptyMessage={
                searchActive ? 'No photos match your search' : 'No photos yet'
              }
            />
          ) : null}
          <ListV2InfiniteScrollFooter
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onFetchNextPage={list.loadMore}
            loadingLabel="Loading more photos…"
            loadMoreLabel="Load more photos"
            enabled={!list.isLoading && list.errorMessage == null}
          />
        </main>
      </DocumentRowSelectionProvider>
    </div>
  );
}
