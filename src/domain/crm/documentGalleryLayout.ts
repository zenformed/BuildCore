/**
 * Justified gallery rows (Google Photos–style) + date-group packing by width.
 */

export type DocumentGalleryAspectItem = {
  readonly id: string;
  /** width / height */
  readonly aspectRatio: number;
};

export type DocumentGalleryJustifiedItem = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
};

export type DocumentGalleryJustifiedRow = {
  readonly items: readonly DocumentGalleryJustifiedItem[];
  /** True when the row was scaled to fill the container width. */
  readonly filled: boolean;
};

export type DocumentGalleryPackGroup = {
  readonly dayKey: string;
  readonly itemIds: readonly string[];
  readonly aspectsById: ReadonlyMap<string, number>;
};

export type DocumentGalleryPackRow = {
  readonly dayKeys: readonly string[];
};

export const DOCUMENT_GALLERY_TILE_GAP = 8;

export const DOCUMENT_GALLERY_ASPECT = {
  imageFallback: 4 / 3,
  videoFallback: 16 / 9,
  documentFallback: 0.72,
} as const;

export function resolveDocumentGalleryRowHeight(containerWidth: number): number {
  if (containerWidth < 420) return 100;
  if (containerWidth < 720) return 120;
  if (containerWidth < 1100) return 148;
  return 160;
}

export function clampDocumentGalleryAspectRatio(aspectRatio: number): number {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return DOCUMENT_GALLERY_ASPECT.imageFallback;
  }
  // Keep orientation; limit extremes so tiles stay usable.
  const minAspect = 0.45; // very tall → still readable width at row height
  const maxAspect = 2.6; // panoramic → does not dominate a row
  return Math.min(maxAspect, Math.max(minAspect, aspectRatio));
}

function idealWidthAtHeight(aspectRatio: number, rowHeight: number): number {
  return clampDocumentGalleryAspectRatio(aspectRatio) * rowHeight;
}

/**
 * Pack items into justified rows at a target height.
 * Completed rows scale uniformly to fill `containerWidth`.
 * The trailing incomplete row keeps the target height (no stretch).
 */
export function justifyDocumentGalleryItems(input: {
  readonly items: readonly DocumentGalleryAspectItem[];
  readonly containerWidth: number;
  readonly rowHeight: number;
  readonly gap: number;
}): DocumentGalleryJustifiedRow[] {
  const { items, gap } = input;
  const containerWidth = Math.max(input.containerWidth, 1);
  const rowHeight = Math.max(input.rowHeight, 1);
  if (items.length === 0) return [];

  const rows: DocumentGalleryJustifiedRow[] = [];
  let buffer: DocumentGalleryAspectItem[] = [];
  let bufferIdealWidth = 0;

  const flush = (fill: boolean): void => {
    if (buffer.length === 0) return;
    const gaps = Math.max(buffer.length - 1, 0) * gap;
    const idealSum = bufferIdealWidth;
    const scale =
      fill && idealSum > 0 ? Math.max(0.5, (containerWidth - gaps) / idealSum) : 1;
    const height = rowHeight * scale;
    rows.push({
      filled: fill,
      items: buffer.map((item) => {
        const width = idealWidthAtHeight(item.aspectRatio, rowHeight) * scale;
        return {
          id: item.id,
          width,
          height,
          aspectRatio: item.aspectRatio,
        };
      }),
    });
    buffer = [];
    bufferIdealWidth = 0;
  };

  for (const item of items) {
    const nextWidth = idealWidthAtHeight(item.aspectRatio, rowHeight);
    const nextGaps = buffer.length * gap;
    const wouldExceed =
      buffer.length > 0 && bufferIdealWidth + nextGaps + nextWidth > containerWidth;

    if (wouldExceed) {
      flush(true);
    }

    buffer.push(item);
    bufferIdealWidth += nextWidth;

    // Single item wider than container: still one filled row (clamped aspect helps).
    if (buffer.length === 1 && bufferIdealWidth > containerWidth) {
      flush(true);
    }
  }

  flush(false);
  return rows;
}

/** Total width of a day's tiles if laid out in the given container (multi-row → full width). */
export function measureDocumentGalleryDayGroupWidth(input: {
  readonly itemIds: readonly string[];
  readonly aspectsById: ReadonlyMap<string, number>;
  readonly containerWidth: number;
  readonly rowHeight: number;
  readonly gap: number;
}): number {
  const { itemIds, aspectsById, containerWidth, rowHeight, gap } = input;
  if (itemIds.length === 0) return 0;

  const items = itemIds.map((id) => ({
    id,
    aspectRatio: aspectsById.get(id) ?? DOCUMENT_GALLERY_ASPECT.imageFallback,
  }));

  const rows = justifyDocumentGalleryItems({
    items,
    containerWidth,
    rowHeight,
    gap,
  });

  if (rows.length === 0) return 0;
  if (rows.length > 1 || rows[0]!.filled) {
    return containerWidth;
  }

  const only = rows[0]!;
  const gaps = Math.max(only.items.length - 1, 0) * gap;
  return only.items.reduce((sum, item) => sum + item.width, 0) + gaps;
}

/**
 * Pack date groups into outer rows. A group shares the current outer row only when
 * its preferred (full-container) width fits in the remaining space.
 *
 * Important: never measure against the remaining width for fit checks — constraining
 * to remaining always reports width ≤ remaining (via fill/wrap), which incorrectly
 * packs every group into one overflowing flex row.
 */
export function packDocumentGalleryDayGroups(input: {
  readonly groups: readonly DocumentGalleryPackGroup[];
  readonly containerWidth: number;
  readonly rowHeight: number;
  readonly gap: number;
}): DocumentGalleryPackRow[] {
  const { groups, rowHeight, gap } = input;
  const containerWidth = Math.max(input.containerWidth, 1);
  if (groups.length === 0) return [];

  const rows: DocumentGalleryPackRow[] = [];
  let currentKeys: string[] = [];
  let remaining = containerWidth;

  const flush = (): void => {
    if (currentKeys.length === 0) return;
    rows.push({ dayKeys: currentKeys });
    currentKeys = [];
    remaining = containerWidth;
  };

  for (const group of groups) {
    const preferredWidth = measureDocumentGalleryDayGroupWidth({
      itemIds: group.itemIds,
      aspectsById: group.aspectsById,
      containerWidth,
      rowHeight,
      gap,
    });
    const needsFullWidth = preferredWidth >= containerWidth - 1;

    if (needsFullWidth) {
      flush();
      rows.push({ dayKeys: [group.dayKey] });
      remaining = containerWidth;
      continue;
    }

    if (currentKeys.length > 0 && preferredWidth <= remaining + 0.5) {
      currentKeys.push(group.dayKey);
      remaining = Math.max(0, remaining - preferredWidth - gap);
      if (remaining < rowHeight * 0.45) flush();
      continue;
    }

    flush();
    currentKeys = [group.dayKey];
    remaining = Math.max(0, containerWidth - preferredWidth - gap);
    if (remaining < rowHeight * 0.45) flush();
  }

  flush();
  return rows;
}

/** @deprecated Prefer resolveDocumentGalleryRowHeight — kept for older call sites. */
export function resolveDocumentGalleryTileSize(containerWidth: number): number {
  return resolveDocumentGalleryRowHeight(containerWidth);
}
