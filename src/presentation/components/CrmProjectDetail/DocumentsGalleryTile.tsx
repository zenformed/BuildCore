'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import {
  formatCrmDocumentExtensionBadge,
  isCrmDocumentImage,
  isCrmDocumentPdf,
  isCrmDocumentVideo,
} from '@/presentation/features/crmProjectDetail/documentGalleryMedia';
import { useCrmDocumentPreviewBlob } from '@/presentation/features/crmProjectDetail/useCrmDocumentPreviewBlob';
import { useCrmDocumentPdfThumbnail } from '@/presentation/features/crmProjectDetail/useCrmDocumentPdfThumbnail';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { truncateDisplayText } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { WorkflowDocumentFileIcon } from './WorkflowDocumentFileIcon';
import { DocumentsGallerySelectCircle } from './DocumentsGallerySelectCircle';
import styles from './ProjectDetail.module.css';

export type DocumentsGalleryTileProps = {
  readonly projectSlug: string;
  readonly document: CrmDocumentMetadata;
  readonly width: number;
  readonly height: number;
  readonly onOpenPreview: (documentId: string) => void;
  readonly onAspectRatio?: (documentId: string, aspectRatio: number) => void;
};

export function DocumentsGalleryTile({
  projectSlug,
  document: doc,
  width,
  height,
  onOpenPreview,
  onAspectRatio,
}: DocumentsGalleryTileProps): ReactElement {
  const rowSelection = useDocumentRowSelection();
  const galleryCopy = content.projectDetail.documents.gallery;
  const isMobileLayout = useDashboardMobileLayout();
  const tileRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  const isImage = isCrmDocumentImage(doc.name, doc.mimeType);
  const isVideo = isCrmDocumentVideo(doc.name, doc.mimeType);
  const isPdf = isCrmDocumentPdf(doc.name, doc.mimeType);
  const wantsBlob = (isImage || isVideo || isPdf) && !mediaFailed;
  const blobUrl = useCrmDocumentPreviewBlob(
    projectSlug,
    wantsBlob ? doc : null,
    inView && wantsBlob
  );
  const pdfThumb = useCrmDocumentPdfThumbnail(
    isPdf ? doc.id : null,
    isPdf ? blobUrl : null,
    inView && isPdf && !mediaFailed
  );

  const selected = rowSelection?.selectedIds.has(doc.id) === true;
  const showSelect =
    isMobileLayout ||
    hovered ||
    focused ||
    selected ||
    (rowSelection != null && rowSelection.selectedCount > 0);

  const showImage = Boolean(blobUrl) && !mediaFailed && isImage;
  const showVideo = Boolean(blobUrl) && !mediaFailed && isVideo;
  const showPdf = pdfThumb.status === 'ready' && Boolean(pdfThumb.url) && !mediaFailed && isPdf;
  const showMedia = showImage || showVideo || showPdf;
  const pdfFailed = isPdf && (mediaFailed || pdfThumb.status === 'error');
  const mediaPending = wantsBlob && !showMedia && !mediaFailed && !pdfFailed;
  const showDocumentFallback =
    (!isImage && !isVideo && !isPdf) || mediaFailed || pdfFailed;

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

  const reportAspect = (naturalWidth: number, naturalHeight: number): void => {
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    onAspectRatio?.(doc.id, naturalWidth / naturalHeight);
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
      onClick={() => onOpenPreview(doc.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {rowSelection != null ? (
        <span className={styles.docGalleryTileSelectWrap}>
          <DocumentsGallerySelectCircle
            checked={selected}
            visible={showSelect}
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
          src={blobUrl!}
          alt=""
          loading="lazy"
          draggable={false}
          onLoad={(event) => {
            reportAspect(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
          }}
          onError={() => setMediaFailed(true)}
        />
      ) : null}

      {showVideo ? (
        <>
          <video
            className={styles.docGalleryTileImage}
            src={blobUrl!}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              reportAspect(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
            }}
            onError={() => setMediaFailed(true)}
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
    </button>
  );
}
