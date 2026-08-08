'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import {
  formatCrmDocumentExtensionBadge,
  isCrmDocumentImage,
  isCrmDocumentPdf,
  isCrmDocumentVideo,
} from '@/presentation/features/crmProjectDetail/documentGalleryMedia';
import {
  refreshCrmDocumentBrowseUrl,
  useCrmDocumentBrowseUrl,
} from '@/presentation/features/crmProjectDetail/useCrmDocumentBrowseUrl';
import { useCrmDocumentPdfThumbnail } from '@/presentation/features/crmProjectDetail/useCrmDocumentPdfThumbnail';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { truncateDisplayText } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import { DocumentsGallerySelectCircle } from './DocumentsGallerySelectCircle';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import styles from './ProjectDetail.module.css';

export type DocumentsGalleryTileProps = {
  readonly projectSlug: string;
  readonly document: CrmDocumentMetadata;
  readonly width: number;
  readonly height: number;
  readonly onOpenPreview: (documentId: string) => void;
  readonly onAspectRatio?: (documentId: string, aspectRatio: number) => void;
  /**
   * Authorized signed thumbnail from Photos list v2 (or similar).
   * When present, tiles skip `/browse?variant=thumbnail` until remint is needed.
   */
  readonly listThumbnailUrl?: string | null;
};

export function DocumentsGalleryTile({
  projectSlug,
  document: doc,
  width,
  height,
  onOpenPreview,
  onAspectRatio,
  listThumbnailUrl = null,
}: DocumentsGalleryTileProps): ReactElement {
  const rowSelection = useDocumentRowSelection();
  const galleryCopy = content.projectDetail.documents.gallery;
  const isMobileLayout = useDashboardMobileLayout();
  const tileRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [browseReloadToken, setBrowseReloadToken] = useState(0);
  /** After a list thumb fails, stop re-seeding that URL so browse can remint. */
  const [ignoreListThumbnail, setIgnoreListThumbnail] = useState(false);
  const browseRetryUsedRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  const isImage = isCrmDocumentImage(doc.name, doc.mimeType);
  const isVideo = isCrmDocumentVideo(doc.name, doc.mimeType);
  const isPdf = isCrmDocumentPdf(doc.name, doc.mimeType);
  const isDemoRuntime = isDemoRuntimeClient();
  const wantsBrowse = (isImage || isVideo || isPdf) && !mediaFailed;
  const browseVariant = isImage ? 'thumbnail' : 'original';
  const effectiveListThumbnailUrl =
    isImage && !ignoreListThumbnail ? (listThumbnailUrl?.trim() || null) : null;
  const browseUrl = useCrmDocumentBrowseUrl(
    projectSlug,
    wantsBrowse ? doc : null,
    wantsBrowse && (inView || effectiveListThumbnailUrl != null),
    browseReloadToken,
    browseVariant,
    effectiveListThumbnailUrl
  );
  const pdfThumb = useCrmDocumentPdfThumbnail(
    isPdf ? doc.id : null,
    isPdf ? browseUrl : null,
    inView && isPdf && !mediaFailed
  );

  const selected = rowSelection?.selectedIds.has(doc.id) === true;
  const selectionActive = rowSelection != null && rowSelection.selectedCount > 0;
  const showSelect = isMobileLayout
    ? selectionActive
    : hovered || focused || selected || selectionActive;

  const showImage = Boolean(browseUrl) && !mediaFailed && isImage;
  const showVideo = Boolean(browseUrl) && !mediaFailed && isVideo;
  const showPdf = pdfThumb.status === 'ready' && Boolean(pdfThumb.url) && !mediaFailed && isPdf;
  const showMedia = showImage || showVideo || showPdf;
  const pdfFailed = isPdf && (mediaFailed || pdfThumb.status === 'error');
  const mediaPending = wantsBrowse && !showMedia && !mediaFailed && !pdfFailed && !isDemoRuntime;
  const demoNoPreview = isDemoRuntime && (isImage || isVideo || isPdf) && !showMedia;
  const showDocumentFallback =
    (!isImage && !isVideo && !isPdf) || mediaFailed || pdfFailed || demoNoPreview;

  useEffect(() => {
    const node = tileRef.current;
    if (node == null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (longPressTimerRef.current != null) {
        clearTimeout(longPressTimerRef.current);
      }
    },
    []
  );

  const reportAspect = (naturalWidth: number, naturalHeight: number): void => {
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    onAspectRatio?.(doc.id, naturalWidth / naturalHeight);
  };

  const handleMediaError = (): void => {
    if (!browseRetryUsedRef.current) {
      browseRetryUsedRef.current = true;
      setIgnoreListThumbnail(true);
      refreshCrmDocumentBrowseUrl(doc.id, browseVariant);
      setBrowseReloadToken((value) => value + 1);
      return;
    }
    setMediaFailed(true);
  };

  const cancelLongPress = (): void => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!isMobileLayout || rowSelection == null || event.button !== 0) return;
    cancelLongPress();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      pointerStartRef.current = null;
      suppressNextClickRef.current = true;
      rowSelection.selectMany([doc.id]);
    }, 500);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const start = pointerStartRef.current;
    if (start == null) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
      cancelLongPress();
    }
  };

  return (
    <button
      ref={tileRef}
      type="button"
      className={[
        styles.docGalleryTile,
        selected ? styles.docGalleryTile_selected : '',
        showDocumentFallback ? styles.docGalleryTile_document : '',
        mediaPending ? styles.docGalleryTile_loading : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width, height }}
      title={doc.name}
      aria-label={galleryCopy.openPreview(doc.name)}
      onClick={() => {
        if (suppressNextClickRef.current) {
          suppressNextClickRef.current = false;
          return;
        }
        if (isMobileLayout && rowSelection != null && rowSelection.selectedCount > 0) {
          rowSelection.onToggle(doc.id);
          return;
        }
        onOpenPreview(doc.id);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onContextMenu={(event) => {
        if (isMobileLayout) event.preventDefault();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {rowSelection != null && showSelect ? (
        <span className={styles.docGalleryTileSelectWrap}>
          <DocumentsGallerySelectCircle
            checked={selected}
            visible
            ariaLabel={
              selected
                ? galleryCopy.deselectDocument(doc.name)
                : galleryCopy.selectDocument(doc.name)
            }
            onChange={() => rowSelection.onToggle(doc.id)}
          />
        </span>
      ) : null}

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.docGalleryTileImage}
          src={browseUrl!}
          alt=""
          loading={effectiveListThumbnailUrl ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            reportAspect(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
          }}
          onError={handleMediaError}
        />
      ) : null}

      {showVideo ? (
        <>
          <video
            className={styles.docGalleryTileImage}
            src={browseUrl!}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              reportAspect(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
            }}
            onError={handleMediaError}
          />
          <span className={styles.docGalleryTileVideoBadge} aria-label={galleryCopy.videoIndicator}>
            ▶
          </span>
        </>
      ) : null}

      {showPdf ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.docGalleryTileImage}
          src={pdfThumb.url!}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            reportAspect(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
          }}
          onError={() => setMediaFailed(true)}
        />
      ) : null}

      {showDocumentFallback ? (
        <span className={styles.docGalleryTileDocFallback}>
          <WorkflowDocumentFileIcon fileName={doc.name} mimeType={doc.mimeType} modal />
          <span className={styles.docGalleryTileDocExt}>
            {formatCrmDocumentExtensionBadge(doc.name, doc.mimeType)}
          </span>
          <span className={styles.docGalleryTileDocName} title={doc.name}>
            {truncateDisplayText(doc.name, 28)}
          </span>
        </span>
      ) : null}

      <span className={styles.docGalleryTileUploader} aria-hidden>
        <TeamMemberAvatar member={doc.uploadedBy} />
      </span>
    </button>
  );
}
