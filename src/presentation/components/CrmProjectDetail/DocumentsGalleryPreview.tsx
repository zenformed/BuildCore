'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBuildCoreDisplayDateTime } from '@/platform/formatting/buildCoreDisplayDate';
import {
  formatFileSize,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import {
  formatCrmDocumentFriendlyType,
  isCrmDocumentImage,
  isCrmDocumentPdf,
  isCrmDocumentVideo,
} from '@/presentation/features/crmProjectDetail/documentGalleryMedia';
import { useCrmDocumentPreviewBlob } from '@/presentation/features/crmProjectDetail/useCrmDocumentPreviewBlob';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import styles from './ProjectDetail.module.css';

export type DocumentsGalleryPreviewProps = {
  readonly documents: readonly CrmDocumentMetadata[];
  readonly orderedIds: readonly string[];
  readonly initialDocumentId: string;
  readonly resolveProjectSlug: (doc: CrmDocumentMetadata) => string;
  readonly resolveProjectLabel: (doc: CrmDocumentMetadata) => string;
  readonly resolveTaskTitle: (doc: CrmDocumentMetadata) => string;
  readonly onDownloadDocument: (doc: CrmDocumentMetadata) => Promise<void>;
  readonly onDeleteDocument?: (doc: CrmDocumentMetadata) => Promise<void>;
  readonly canDeleteDocument?: (doc: CrmDocumentMetadata) => boolean;
  readonly onClose: () => void;
};

export function DocumentsGalleryPreview({
  documents,
  orderedIds,
  initialDocumentId,
  resolveProjectSlug,
  resolveProjectLabel,
  resolveTaskTitle,
  onDownloadDocument,
  onDeleteDocument,
  canDeleteDocument,
  onClose,
}: DocumentsGalleryPreviewProps): ReactElement | null {
  const docsCopy = content.projectDetail.documents;
  const galleryCopy = docsCopy.gallery;
  const wf = content.projectDetail.workflow;
  const isMobileLayout = useDashboardMobileLayout();
  const [activeId, setActiveId] = useState(initialDocumentId);
  const [metaOpen, setMetaOpen] = useState(!isMobileLayout);
  const [busy, setBusy] = useState(false);
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const docsById = useMemo(() => {
    const map = new Map<string, CrmDocumentMetadata>();
    for (const doc of documents) map.set(doc.id, doc);
    return map;
  }, [documents]);

  const activeDoc = docsById.get(activeId) ?? null;
  const activeIndex = orderedIds.indexOf(activeId);
  const canPrev = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < orderedIds.length - 1;

  const blobUrl = useCrmDocumentPreviewBlob(
    activeDoc != null ? resolveProjectSlug(activeDoc) : '',
    activeDoc,
    activeDoc != null
  );

  const goPrev = useCallback(() => {
    if (!canPrev) return;
    setActiveId(orderedIds[activeIndex - 1]!);
  }, [activeIndex, canPrev, orderedIds]);

  const goNext = useCallback(() => {
    if (!canNext) return;
    setActiveId(orderedIds[activeIndex + 1]!);
  }, [activeIndex, canNext, orderedIds]);

  const handleSwipeStart = (
    event: ReactPointerEvent<HTMLElement>
  ): void => {
    if (!isMobileLayout || event.pointerType === 'mouse') return;
    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSwipeEnd = (
    event: ReactPointerEvent<HTMLElement>
  ): void => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (
      !isMobileLayout ||
      start == null ||
      start.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaY) < 60 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

    if (deltaY < 0) {
      setMetaOpen(true);
    } else if (metaOpen) {
      setMetaOpen(false);
    } else {
      onClose();
    }
  };

  const cancelSwipe = (): void => {
    swipeStartRef.current = null;
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [goNext, goPrev, onClose]);

  if (activeDoc == null) return null;

  const isImage = isCrmDocumentImage(activeDoc.name, activeDoc.mimeType);
  const isVideo = isCrmDocumentVideo(activeDoc.name, activeDoc.mimeType);
  const isPdf = isCrmDocumentPdf(activeDoc.name, activeDoc.mimeType);

  const metaRows = [
    { label: galleryCopy.metadata.project, value: resolveProjectLabel(activeDoc) },
    { label: galleryCopy.metadata.fileName, value: activeDoc.name },
    {
      label: galleryCopy.metadata.fileType,
      value: formatCrmDocumentFriendlyType(activeDoc.name, activeDoc.mimeType),
    },
    { label: galleryCopy.metadata.taskName, value: resolveTaskTitle(activeDoc) },
    {
      label: galleryCopy.metadata.date,
      value: formatBuildCoreDisplayDateTime(activeDoc.uploadedAt),
    },
    {
      label: galleryCopy.metadata.fileSize,
      value: formatFileSize(activeDoc.sizeBytes),
    },
  ];

  return (
    <div className={styles.docGalleryPreview} role="dialog" aria-modal="true" aria-label={activeDoc.name}>
      <div className={styles.docGalleryPreviewToolbar}>
        <button
          type="button"
          className={styles.docGalleryPreviewToolbarBtn}
          onClick={onClose}
          aria-label={galleryCopy.closePreview}
          title={galleryCopy.closePreview}
        >
          ✕
        </button>
        <span className={styles.docGalleryPreviewToolbarTitle} title={activeDoc.name}>
          {activeDoc.name}
        </span>
        <div className={styles.docGalleryPreviewToolbarActions}>
          <button
            type="button"
            className={styles.docGalleryPreviewToolbarBtn}
            disabled={busy}
            title={wf.documentDownload}
            aria-label={wf.documentDownload}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await onDownloadDocument(activeDoc);
                } catch {
                  // Consumer owns toast/error presentation.
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            <span className={styles.inlineMenuDownloadIcon} aria-hidden />
          </button>
          {onDeleteDocument != null &&
          (canDeleteDocument?.(activeDoc) ?? true) ? (
            <button
              type="button"
              className={styles.docGalleryPreviewToolbarBtn}
              disabled={busy}
              title={wf.documentDelete}
              aria-label={wf.documentDelete}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await onDeleteDocument(activeDoc);
                  } catch {
                    // Consumer owns toast/error presentation.
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <span className={styles.inlineMenuDeleteIcon} aria-hidden />
            </button>
          ) : null}
          {isMobileLayout ? (
            <button
              type="button"
              className={styles.docGalleryPreviewToolbarBtn}
              aria-expanded={metaOpen}
              aria-label={metaOpen ? galleryCopy.hideMetadata : galleryCopy.showMetadata}
              onClick={() => setMetaOpen((open) => !open)}
            >
              ℹ
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={[
          styles.docGalleryPreviewBody,
          metaOpen ? styles.docGalleryPreviewBody_metaOpen : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={styles.docGalleryPreviewStage}
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={cancelSwipe}
        >
          <div className={styles.docGalleryPreviewMedia}>
            {blobUrl && isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.docGalleryPreviewImage} src={blobUrl} alt={activeDoc.name} />
            ) : blobUrl && isVideo ? (
              <video
                className={styles.docGalleryPreviewVideo}
                src={blobUrl}
                controls
                playsInline
                preload="metadata"
              />
            ) : blobUrl && isPdf ? (
              <iframe
                className={styles.docGalleryPreviewPdf}
                title={activeDoc.name}
                src={blobUrl}
              />
            ) : (
              <div className={styles.docGalleryPreviewFallback}>
                <WorkflowDocumentFileIcon
                  fileName={activeDoc.name}
                  mimeType={activeDoc.mimeType}
                  modal
                />
                <p>{galleryCopy.previewUnavailable}</p>
              </div>
            )}
          </div>

          <div className={styles.docGalleryPreviewCarouselNav}>
            <button
              type="button"
              className={styles.docGalleryPreviewNavBtn}
              disabled={!canPrev}
              aria-label={galleryCopy.previousDocument}
              onClick={goPrev}
            >
              ‹
            </button>
            <span className={styles.docGalleryPreviewCarouselCount} aria-hidden>
              {activeIndex >= 0 ? activeIndex + 1 : 1} / {orderedIds.length}
            </span>
            <button
              type="button"
              className={styles.docGalleryPreviewNavBtn}
              disabled={!canNext}
              aria-label={galleryCopy.nextDocument}
              onClick={goNext}
            >
              ›
            </button>
          </div>
        </div>

        {metaOpen ? (
          <aside className={styles.docGalleryPreviewMeta}>
            {isMobileLayout ? (
              <div
                className={styles.docGalleryPreviewMetaHandle}
                aria-hidden
                onPointerDown={handleSwipeStart}
                onPointerUp={handleSwipeEnd}
                onPointerCancel={cancelSwipe}
              >
                <span />
              </div>
            ) : null}
            <dl className={styles.docGalleryPreviewMetaList}>
              {metaRows.map((row) => (
                <div key={row.label} className={styles.docGalleryPreviewMetaRow}>
                  <dt>{row.label}</dt>
                  <dd title={row.value}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
