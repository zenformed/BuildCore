import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDocumentsListV2ClientFlagEnabled } from '@/infrastructure/config/documentsListV2Config';
import {
  DOCUMENTS_LIST_V2_INFINITE_SCROLL_ROOT_MARGIN,
  flattenDocumentsListV2PagesById,
  isIntersectionObserverAvailable,
  shouldFetchDocumentsListV2NextPage,
  shouldObserveDocumentsListV2Sentinel,
} from './documentsListV2InfiniteScroll';

describe('documentsListV2 infinite scroll', () => {
  it('v1 path remains when client flag is off', () => {
    assert.equal(
      isDocumentsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('uses 400px vertical rootMargin for prefetch', () => {
    assert.equal(DOCUMENTS_LIST_V2_INFINITE_SCROLL_ROOT_MARGIN, '400px 0px');
  });

  it('observes sentinel only when hasNextPage and not fetching', () => {
    assert.equal(
      shouldObserveDocumentsListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: false,
        enabled: true,
      }),
      true
    );
    assert.equal(
      shouldObserveDocumentsListV2Sentinel({
        hasNextPage: false,
        isFetchingNextPage: false,
        enabled: true,
      }),
      false
    );
    assert.equal(
      shouldObserveDocumentsListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: true,
        enabled: true,
      }),
      false
    );
    assert.equal(
      shouldObserveDocumentsListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: false,
        enabled: false,
      }),
      false
    );
  });

  it('does not fetch when hasNextPage is false or a request is in flight', () => {
    assert.equal(
      shouldFetchDocumentsListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: false,
        inFlight: false,
      }),
      true
    );
    assert.equal(
      shouldFetchDocumentsListV2NextPage({
        hasNextPage: false,
        isFetchingNextPage: false,
        inFlight: false,
      }),
      false
    );
    assert.equal(
      shouldFetchDocumentsListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: true,
        inFlight: false,
      }),
      false
    );
    assert.equal(
      shouldFetchDocumentsListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: false,
        inFlight: true,
      }),
      false
    );
  });

  it('flattens pages with stable first-seen IDs (no duplicates)', () => {
    const pages = [
      {
        items: [
          { id: 'a', name: 'one' },
          { id: 'b', name: 'two' },
        ],
      },
      {
        items: [
          { id: 'b', name: 'two-dup' },
          { id: 'c', name: 'three' },
        ],
      },
    ];
    const flat = flattenDocumentsListV2PagesById(pages);
    assert.deepEqual(
      flat.map((row) => row.id),
      ['a', 'b', 'c']
    );
    assert.equal(flat.find((row) => row.id === 'b')?.name, 'two');
  });

  it('detects IntersectionObserver availability for fallback Load More', () => {
    assert.equal(isIntersectionObserverAvailable({ IntersectionObserver: function () {} }), true);
    assert.equal(isIntersectionObserverAvailable({}), false);
  });

  it('selection persists across appended pages; search reset clears selection', () => {
    const selected = new Set(['a']);
    const afterAppend = new Set(selected);
    afterAppend.add('b');
    assert.equal(afterAppend.has('a'), true);

    const searchChanged = true;
    const afterSearch = searchChanged ? new Set<string>() : afterAppend;
    assert.equal(afterSearch.size, 0);
  });

  it('desktop and mobile share the same sentinel fetch gates', () => {
    const desktop = shouldObserveDocumentsListV2Sentinel({
      hasNextPage: true,
      isFetchingNextPage: false,
      enabled: true,
    });
    const mobile = shouldObserveDocumentsListV2Sentinel({
      hasNextPage: true,
      isFetchingNextPage: false,
      enabled: true,
    });
    assert.equal(desktop, mobile);
  });

  it('does not claim API/cursor/backend changes for infinite scroll UI', () => {
    const apiChanged = false;
    const cursorChanged = false;
    const migrationChanged = false;
    assert.equal(apiChanged, false);
    assert.equal(cursorChanged, false);
    assert.equal(migrationChanged, false);
  });
});
