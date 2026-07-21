import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDocumentGalleryDayHeading,
  groupDocumentsByGalleryDay,
} from './documentGalleryDateGroups';
import type { CrmDocumentMetadata } from './document';

function doc(
  partial: Partial<CrmDocumentMetadata> & Pick<CrmDocumentMetadata, 'id' | 'uploadedAt'>
): CrmDocumentMetadata {
  return {
    workflowTaskId: null,
    budgetEntryId: null,
    name: `${partial.id}.jpg`,
    kind: 'photo',
    stageSlug: null,
    uploadedBy: {
      id: 'u1',
      displayName: 'User',
      initials: 'U',
      avatarUrl: null,
      email: null,
    },
    reviewedAt: null,
    reviewedBy: null,
    mimeType: 'image/jpeg',
    sizeBytes: 1000,
    ...partial,
  };
}

describe('formatDocumentGalleryDayHeading', () => {
  const now = new Date(2026, 6, 20); // Jul 20, 2026

  it('labels today and yesterday', () => {
    assert.equal(formatDocumentGalleryDayHeading('2026-07-20', now), 'Today');
    assert.equal(formatDocumentGalleryDayHeading('2026-07-19', now), 'Yesterday');
  });

  it('uses weekday for same-year older days', () => {
    assert.equal(formatDocumentGalleryDayHeading('2026-07-18', now), 'Sat, Jul 18');
  });

  it('includes year for other years', () => {
    assert.equal(formatDocumentGalleryDayHeading('2025-06-24', now), 'Jun 24, 2025');
  });
});

describe('groupDocumentsByGalleryDay', () => {
  it('sorts newest first and groups by day', () => {
    const groups = groupDocumentsByGalleryDay(
      [
        doc({ id: 'a', uploadedAt: new Date(2026, 6, 18, 12).toISOString() }),
        doc({ id: 'b', uploadedAt: new Date(2026, 6, 20, 8).toISOString() }),
        doc({ id: 'c', uploadedAt: new Date(2026, 6, 20, 18).toISOString() }),
      ],
      new Date(2026, 6, 20, 20, 0, 0)
    );
    assert.equal(groups.length, 2);
    assert.deepEqual(
      groups[0]!.documents.map((d) => d.id),
      ['c', 'b']
    );
    assert.equal(groups[1]?.documents[0]?.id, 'a');
  });
});
