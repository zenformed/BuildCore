'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import type { CrmDocumentMetadata, CrmProjectDetail } from '@/domain/crm';
import {
  groupDocumentsByGalleryDay,
  type DocumentGalleryDayGroup,
} from '@/domain/crm/documentGalleryDateGroups';
import {
  DOCUMENT_GALLERY_TILE_GAP,
  justifyDocumentGalleryItems,
  packDocumentGalleryDayGroups,
  resolveDocumentGalleryRowHeight,
  type DocumentGalleryJustifiedRow,
} from '@/domain/crm/documentGalleryLayout';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useDocumentRowSelection } from '@/presentation/features/crmProjectDetail/documentRowSelectionContext';
import {
  peekLearnedDocumentGalleryAspect,
  rememberDocumentGalleryAspect,
  resolveDocumentGalleryAspectRatio,
} from '@/presentation/features/crmProjectDetail/documentGalleryMedia';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { DocumentsGallerySelectCircle } from './DocumentsGallerySelectCircle';
import { DocumentsGalleryTile } from './DocumentsGalleryTile';
import { DocumentsGalleryPreview } from './DocumentsGalleryPreview';
import styles from './ProjectDetail.module.css';

export type DocumentsGalleryProps = {
  readonly project: CrmProjectDetail;
  readonly documents: readonly CrmDocumentMetadata[];
  readonly projectLabel: string;
  readonly resolveTaskTitle: (doc: CrmDocumentMetadata) => string;
};

export function DocumentsGallery({
  project,
  documents,
  projectLabel,
  resolveTaskTitle,
}: DocumentsGalleryProps): ReactElement {
  const rowSelection = useDocumentRowSelection();
  const galleryCopy = content.projectDetail.documents.gallery;
  const isMobileLayout = useDashboardMobileLayout();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [headingHoverKey, setHeadingHoverKey] = useState<string | null>(null);
  const [aspectVersion, setAspectVersion] = useState(0);

  const dayGroups = useMemo(() => groupDocumentsByGalleryDay(documents), [documents]);
  const groupsByKey = useMemo(() => {
    const map = new Map<string, DocumentGalleryDayGroup>();
    for (const group of dayGroups) map.set(group.dayKey, group);
    return map;
  }, [dayGroups]);

  const aspectsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of documents) {
      map.set(
        doc.id,
        peekLearnedDocumentGalleryAspect(doc.id) ?? resolveDocumentGalleryAspectRatio(doc)
      );
    }
    return map;
    // aspectVersion intentionally invalidates when thumbnails report natural size
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, aspectVersion]);

  const rowHeight = resolveDocumentGalleryRowHeight(containerWidth || 800);
  const gap = DOCUMENT_GALLERY_TILE_GAP;
  const layoutWidth = Math.max(containerWidth, rowHeight);

  const packedRows = useMemo(() => {
    // Mobile: every date gets its own full-width row.
    if (isMobileLayout) {
      return dayGroups.map((group) => ({ dayKeys: [group.dayKey] }));
    }
    return packDocumentGalleryDayGroups({
      groups: dayGroups.map((group) => ({
        dayKey: group.dayKey,
        itemIds: group.documents.map((doc) => doc.id),
        aspectsById,
      })),
      containerWidth: layoutWidth,
      rowHeight,
      gap,
    });
  }, [aspectsById, dayGroups, gap, isMobileLayout, layoutWidth, rowHeight]);

  const justifiedByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof justifyDocumentGalleryItems>>();
    for (const group of dayGroups) {
      const packRow = packedRows.find((row) => row.dayKeys.includes(group.dayKey));
      const sharing = (packRow?.dayKeys.length ?? 1) > 1;
      const dayWidth = sharing
        ? measureSharedDayWidth(group, aspectsById, layoutWidth, rowHeight, gap)
        : layoutWidth;
      map.set(
        group.dayKey,
        justifyDocumentGalleryItems({
          items: group.documents.map((doc) => ({
            id: doc.id,
            aspectRatio: aspectsById.get(doc.id) ?? resolveDocumentGalleryAspectRatio(doc),
          })),
          containerWidth: Math.max(dayWidth, 1),
          rowHeight,
          gap,
        })
      );
    }
    return map;
  }, [aspectsById, dayGroups, gap, layoutWidth, packedRows, rowHeight]);

  useEffect(() => {
    const node = containerRef.current;
    if (node == null) return;
    const update = (): void => {
      setContainerWidth(node.clientWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const orderedIds = useMemo(
    () => dayGroups.flatMap((g) => g.documents.map((d) => d.id)),
    [dayGroups]
  );

  const handleAspectRatio = useCallback((documentId: string, aspectRatio: number) => {
    const previous = peekLearnedDocumentGalleryAspect(documentId);
    if (previous != null && Math.abs(previous - aspectRatio) < 0.01) return;
    rememberDocumentGalleryAspect(documentId, aspectRatio);
    setAspectVersion((value) => value + 1);
  }, []);

  const handleDayToggle = useCallback(
    (group: DocumentGalleryDayGroup) => {
      if (rowSelection == null) return;
      const ids = group.documents.map((doc) => doc.id);
      const allSelected = ids.every((id) => rowSelection.selectedIds.has(id));
      if (allSelected) rowSelection.deselectMany(ids);
      else rowSelection.selectMany(ids);
    },
    [rowSelection]
  );

  const daySelectionState = useCallback(
    (group: DocumentGalleryDayGroup): { checked: boolean; indeterminate: boolean } => {
      if (rowSelection == null || group.documents.length === 0) {
        return { checked: false, indeterminate: false };
      }
      const selectedCount = group.documents.filter((doc) =>
        rowSelection.selectedIds.has(doc.id)
      ).length;
      if (selectedCount === 0) return { checked: false, indeterminate: false };
      if (selectedCount === group.documents.length) return { checked: true, indeterminate: false };
      return { checked: false, indeterminate: true };
    },
    [rowSelection]
  );

  if (documents.length === 0) {
    return <p className={styles.subtitle}>{content.projectDetail.documents.empty}</p>;
  }

  return (
    <>
      <div ref={containerRef} className={styles.docGallery}>
        {isMobileLayout && rowSelection != null && rowSelection.selectedCount > 0 ? (
          <button
            type="button"
            className={styles.docGalleryMobileSelectionPill}
            aria-label={`Clear selection, ${rowSelection.selectedCount} selected`}
            onClick={rowSelection.clearSelection}
          >
            <span aria-hidden>✕</span>
            <span>{rowSelection.selectedCount}</span>
          </button>
        ) : null}
        {packedRows.map((row) => (
          <div key={row.dayKeys.join('|')} className={styles.docGalleryPackRow}>
            {row.dayKeys.map((dayKey) => {
              const group = groupsByKey.get(dayKey);
              if (group == null) return null;
              const sel = daySelectionState(group);
              const selectionActive =
                rowSelection != null && rowSelection.selectedCount > 0;
              const headingActive = isMobileLayout
                ? selectionActive
                : headingHoverKey === dayKey ||
                  sel.checked ||
                  sel.indeterminate ||
                  selectionActive;
              const dayRows = justifiedByDay.get(dayKey) ?? [];
              const sharing = row.dayKeys.length > 1;
              const groupWidth = sharing
                ? Math.ceil(sumJustifiedWidth(dayRows, gap))
                : undefined;

              return (
                <section
                  key={dayKey}
                  className={[
                    styles.docGalleryDayGroup,
                    sharing ? '' : styles.docGalleryDayGroup_full,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={groupWidth != null ? { width: groupWidth } : undefined}
                >
                  <div
                    className={styles.docGalleryDayHeading}
                    role={isMobileLayout ? 'button' : undefined}
                    tabIndex={isMobileLayout ? 0 : undefined}
                    aria-label={
                      isMobileLayout
                        ? sel.checked
                          ? galleryCopy.deselectDay(group.heading)
                          : galleryCopy.selectDay(group.heading)
                        : undefined
                    }
                    onClick={() => {
                      if (isMobileLayout) handleDayToggle(group);
                    }}
                    onKeyDown={(event) => {
                      if (
                        isMobileLayout &&
                        (event.key === 'Enter' || event.key === ' ')
                      ) {
                        event.preventDefault();
                        handleDayToggle(group);
                      }
                    }}
                    onMouseEnter={() => setHeadingHoverKey(dayKey)}
                    onMouseLeave={() => setHeadingHoverKey(null)}
                  >
                    {rowSelection != null && (isMobileLayout ? selectionActive : true) ? (
                      <DocumentsGallerySelectCircle
                        checked={sel.checked}
                        indeterminate={sel.indeterminate}
                        visible={headingActive}
                        ariaLabel={
                          sel.checked
                            ? galleryCopy.deselectDay(group.heading)
                            : galleryCopy.selectDay(group.heading)
                        }
                        onChange={() => handleDayToggle(group)}
                      />
                    ) : null}
                    <h4 className={styles.docGalleryDayHeadingText}>{group.heading}</h4>
                  </div>
                  <div className={styles.docGalleryDayTiles} style={{ gap }}>
                    {dayRows.map((justifiedRow, rowIndex) => (
                      <div
                        key={`${dayKey}-r${rowIndex}`}
                        className={styles.docGalleryJustifiedRow}
                        style={{ gap }}
                      >
                        {justifiedRow.items.map((item) => {
                          const doc = group.documents.find((entry) => entry.id === item.id);
                          if (doc == null) return null;
                          return (
                            <DocumentsGalleryTile
                              key={item.id}
                              projectSlug={project.summary.slug}
                              document={doc}
                              width={item.width}
                              height={item.height}
                              onOpenPreview={setPreviewDocumentId}
                              onAspectRatio={handleAspectRatio}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ))}
      </div>

      {previewDocumentId != null ? (
        <DocumentsGalleryPreview
          project={project}
          documents={documents}
          orderedIds={orderedIds}
          initialDocumentId={previewDocumentId}
          projectLabel={projectLabel}
          resolveTaskTitle={resolveTaskTitle}
          onClose={() => setPreviewDocumentId(null)}
        />
      ) : null}
    </>
  );
}

function sumJustifiedWidth(
  rows: readonly DocumentGalleryJustifiedRow[],
  gap: number
): number {
  if (rows.length === 0) return 0;
  if (rows.length > 1 || rows[0]!.filled) {
    // Multi-row / filled: use content width of widest row
    let max = 0;
    for (const row of rows) {
      const gaps = Math.max(row.items.length - 1, 0) * gap;
      const width = row.items.reduce((sum, item) => sum + item.width, 0) + gaps;
      max = Math.max(max, width);
    }
    return max;
  }
  const only = rows[0]!;
  const gaps = Math.max(only.items.length - 1, 0) * gap;
  return only.items.reduce((sum, item) => sum + item.width, 0) + gaps;
}

function measureSharedDayWidth(
  group: DocumentGalleryDayGroup,
  aspectsById: ReadonlyMap<string, number>,
  containerWidth: number,
  rowHeight: number,
  gap: number
): number {
  const rows = justifyDocumentGalleryItems({
    items: group.documents.map((doc) => ({
      id: doc.id,
      aspectRatio: aspectsById.get(doc.id) ?? resolveDocumentGalleryAspectRatio(doc),
    })),
    containerWidth,
    rowHeight,
    gap,
  });
  return sumJustifiedWidth(rows, gap);
}
