'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type {
  CrmDocumentMetadata,
  CrmOrganizationPhoto,
} from '@/domain/crm';
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
import { loadCrmOrganizationPhotos } from '@/presentation/features/crmPhotos/loadCrmOrganizationPhotos';
import { downloadCrmOrganizationPhotos } from '@/presentation/features/crmPhotos/downloadCrmOrganizationPhotos';
import { deleteCrmOrganizationPhotos } from '@/presentation/features/crmPhotos/deleteCrmOrganizationPhotos';
import projectStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmPhotos.module.css';

const PAGE_SIZE = 40;

export function CrmPhotosPage(): ReactElement {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [photos, setPhotos] = useState<CrmOrganizationPhoto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await loadCrmOrganizationPhotos({
        search,
        limit: PAGE_SIZE,
      });
      setPhotos([...page.photos]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setPhotos([]);
      setNextCursor(null);
      setError(err instanceof Error ? err.message : 'Could not load photos.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadCrmOrganizationPhotos({
        search,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      setPhotos((previous) => {
        const byId = new Map(previous.map((photo) => [photo.document.id, photo]));
        for (const photo of page.photos) byId.set(photo.document.id, photo);
        return [...byId.values()].sort(
          (a, b) =>
            new Date(b.document.uploadedAt).getTime() -
            new Date(a.document.uploadedAt).getTime()
        );
      });
      setNextCursor(page.nextCursor);
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not load more photos.',
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, search]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: '300px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  const photoByDocumentId = useMemo(
    () => new Map(photos.map((photo) => [photo.document.id, photo] as const)),
    [photos]
  );
  const documents = useMemo(() => photos.map((photo) => photo.document), [photos]);
  const documentById = useMemo(
    () => new Map(documents.map((document) => [document.id, document] as const)),
    [documents]
  );
  const downloadableIds = useMemo(
    () =>
      new Set(
        photos.filter((photo) => photo.canDownload).map((photo) => photo.document.id)
      ),
    [photos]
  );
  const deletableIds = useMemo(
    () =>
      new Set(photos.filter((photo) => photo.canDelete).map((photo) => photo.document.id)),
    [photos]
  );

  const removePhotos = useCallback((ids: readonly string[]) => {
    const idSet = new Set(ids);
    setPhotos((previous) =>
      previous.filter((photo) => !idSet.has(photo.document.id))
    );
  }, []);

  const bulkActions = useMemo<DocumentRowSelectionBulkActions>(
    () => ({
      canDownload: downloadableIds.size > 0,
      canDelete: deletableIds.size > 0,
      downloadableDocumentIds: downloadableIds,
      deletableDocumentIds: deletableIds,
      documentsById: documentById,
      onDownloadDocuments: downloadCrmOrganizationPhotos,
      onDeleteDocuments: async (ids) => {
        removePhotos(ids);
        try {
          const result = await deleteCrmOrganizationPhotos(ids);
          if (result.failedCount > 0) await loadFirstPage();
          return result;
        } catch (err) {
          await loadFirstPage();
          throw err;
        }
      },
      onFeedback: setToast,
      guardDelete: (action) => action(),
    }),
    [
      deletableIds,
      documentById,
      downloadableIds,
      loadFirstPage,
      removePhotos,
    ]
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
      removePhotos([document.id]);
      try {
        await deleteCrmOrganizationPhotos([document.id]);
        setToast({ kind: 'success', message: 'Photo deleted.' });
      } catch (err) {
        await loadFirstPage();
        setToast({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not delete photo.',
        });
        throw err;
      }
    },
    [loadFirstPage, removePhotos, resolvePhoto]
  );

  return (
    <div className={styles.pageShell} data-crm-photos-page>
      {toast ? (
        <DetailToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <DocumentRowSelectionProvider
        key={search}
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
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search photos…"
              ariaLabel="Search organization photos"
              className={styles.searchInput}
            />
          </div>
          <div className={styles.headerActions}>
            <DocumentsPanelBulkActions />
          </div>
        </header>

        <main className={styles.content}>
          {loading ? <p className={styles.state}>Loading photos…</p> : null}
          {!loading && error ? <p className={styles.error}>{error}</p> : null}
          {!loading && !error ? (
            <DocumentsGallery
              documents={documents}
              resolveProjectSlug={(document) =>
                resolvePhoto(document)?.projectSlug ?? ''
              }
              resolveProjectLabel={resolveProjectLabel}
              resolveTaskTitle={(document) => resolvePhoto(document)?.taskName ?? '—'}
              onDownloadDocument={handleSingleDownload}
              onDeleteDocument={handleSingleDelete}
              canDeleteDocument={(document) => resolvePhoto(document)?.canDelete === true}
              emptyMessage={
                search ? 'No photos match your search' : 'No photos yet'
              }
            />
          ) : null}
          <div ref={loadMoreRef} className={styles.loadMore}>
            {loadingMore ? 'Loading more photos…' : null}
          </div>
        </main>
      </DocumentRowSelectionProvider>
    </div>
  );
}
