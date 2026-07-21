import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DOCUMENT_GALLERY_ASPECT,
  clampDocumentGalleryAspectRatio,
  justifyDocumentGalleryItems,
  measureDocumentGalleryDayGroupWidth,
  packDocumentGalleryDayGroups,
} from './documentGalleryLayout';

describe('justifyDocumentGalleryItems', () => {
  it('keeps an incomplete trailing row at target height', () => {
    const rows = justifyDocumentGalleryItems({
      items: [
        { id: 'a', aspectRatio: 1 },
        { id: 'b', aspectRatio: 1 },
      ],
      containerWidth: 800,
      rowHeight: 100,
      gap: 10,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.filled, false);
    assert.equal(rows[0]?.items[0]?.height, 100);
  });

  it('scales a completed row to fill width', () => {
    const rows = justifyDocumentGalleryItems({
      items: [
        { id: 'a', aspectRatio: 1 },
        { id: 'b', aspectRatio: 1 },
        { id: 'c', aspectRatio: 1 },
        { id: 'd', aspectRatio: 1 },
      ],
      containerWidth: 300,
      rowHeight: 100,
      gap: 10,
    });
    assert.ok(rows.length >= 1);
    assert.equal(rows[0]?.filled, true);
    const widths = rows[0]!.items.reduce((sum, item) => sum + item.width, 0);
    const gaps = Math.max(rows[0]!.items.length - 1, 0) * 10;
    assert.ok(Math.abs(widths + gaps - 300) < 1);
  });

  it('preserves portrait vs landscape relative widths', () => {
    const rows = justifyDocumentGalleryItems({
      items: [
        { id: 'portrait', aspectRatio: 0.6 },
        { id: 'landscape', aspectRatio: 1.8 },
      ],
      containerWidth: 900,
      rowHeight: 120,
      gap: 8,
    });
    const portrait = rows[0]?.items.find((item) => item.id === 'portrait');
    const landscape = rows[0]?.items.find((item) => item.id === 'landscape');
    assert.ok(portrait && landscape);
    assert.ok(landscape!.width > portrait!.width);
  });
});

describe('clampDocumentGalleryAspectRatio', () => {
  it('clamps extremes while keeping orientation', () => {
    assert.ok(clampDocumentGalleryAspectRatio(0.1) < 1);
    assert.ok(clampDocumentGalleryAspectRatio(10) > 1);
    assert.equal(clampDocumentGalleryAspectRatio(1), 1);
  });
});

describe('packDocumentGalleryDayGroups', () => {
  const gap = 8;
  const rowHeight = 100;
  const container = 400;

  it('places small groups side by side when they fit', () => {
    const aspects = new Map([
      ['a', 1],
      ['b', 1],
    ]);
    const rows = packDocumentGalleryDayGroups({
      groups: [
        { dayKey: 'd1', itemIds: ['a'], aspectsById: aspects },
        { dayKey: 'd2', itemIds: ['b'], aspectsById: aspects },
      ],
      containerWidth: container,
      rowHeight,
      gap,
    });
    assert.deepEqual(rows, [{ dayKeys: ['d1', 'd2'] }]);
  });

  it('starts a new row when the next group cannot fit entirely', () => {
    const aspects = new Map([
      ['a1', DOCUMENT_GALLERY_ASPECT.imageFallback],
      ['a2', DOCUMENT_GALLERY_ASPECT.imageFallback],
      ['b1', DOCUMENT_GALLERY_ASPECT.imageFallback],
      ['b2', DOCUMENT_GALLERY_ASPECT.imageFallback],
    ]);
    const rows = packDocumentGalleryDayGroups({
      groups: [
        { dayKey: 'd1', itemIds: ['a1', 'a2'], aspectsById: aspects },
        { dayKey: 'd2', itemIds: ['b1', 'b2'], aspectsById: aspects },
      ],
      containerWidth: 280,
      rowHeight,
      gap,
    });
    assert.deepEqual(
      rows.map((row) => row.dayKeys),
      [['d1'], ['d2']]
    );
  });

  it('does not squeeze many small groups into one overflowing row', () => {
    const aspects = new Map(
      Array.from({ length: 12 }, (_, index) => [`i${index}`, DOCUMENT_GALLERY_ASPECT.documentFallback] as const)
    );
    const rows = packDocumentGalleryDayGroups({
      groups: Array.from({ length: 12 }, (_, index) => ({
        dayKey: `d${index}`,
        itemIds: [`i${index}`],
        aspectsById: aspects,
      })),
      containerWidth: 400,
      rowHeight,
      gap,
    });
    assert.ok(rows.length > 1);
    for (const row of rows) {
      const width = row.dayKeys.reduce((sum, dayKey, index) => {
        const id = `i${Number(dayKey.slice(1))}`;
        const groupWidth = measureDocumentGalleryDayGroupWidth({
          itemIds: [id],
          aspectsById: aspects,
          containerWidth: 400,
          rowHeight,
          gap,
        });
        return sum + groupWidth + (index > 0 ? gap : 0);
      }, 0);
      assert.ok(width <= 400 + 1);
    }
  });

  it('measures multi-row day groups as full width', () => {
    const aspects = new Map(
      Array.from({ length: 8 }, (_, index) => [`i${index}`, 1.2] as const)
    );
    const width = measureDocumentGalleryDayGroupWidth({
      itemIds: [...aspects.keys()],
      aspectsById: aspects,
      containerWidth: 320,
      rowHeight,
      gap,
    });
    assert.equal(width, 320);
  });
});
