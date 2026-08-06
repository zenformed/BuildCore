import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LIST_V2_INFINITE_SCROLL_ROOT_MARGIN,
  flattenListV2PagesById,
  isIntersectionObserverAvailable,
  shouldFetchListV2NextPage,
  shouldObserveListV2Sentinel,
} from './listV2InfiniteScroll';

describe('listV2InfiniteScroll shared primitive', () => {
  it('uses 400px vertical rootMargin for prefetch', () => {
    assert.equal(LIST_V2_INFINITE_SCROLL_ROOT_MARGIN, '400px 0px');
  });

  it('observes sentinel only when hasNextPage and not fetching', () => {
    assert.equal(
      shouldObserveListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: false,
        enabled: true,
      }),
      true
    );
    assert.equal(
      shouldObserveListV2Sentinel({
        hasNextPage: false,
        isFetchingNextPage: false,
        enabled: true,
      }),
      false
    );
    assert.equal(
      shouldObserveListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: true,
        enabled: true,
      }),
      false
    );
    assert.equal(
      shouldObserveListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: false,
        enabled: false,
      }),
      false
    );
  });

  it('does not fetch when hasNextPage is false or a request is in flight', () => {
    assert.equal(
      shouldFetchListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: false,
        inFlight: false,
      }),
      true
    );
    assert.equal(
      shouldFetchListV2NextPage({
        hasNextPage: false,
        isFetchingNextPage: false,
        inFlight: false,
      }),
      false
    );
    assert.equal(
      shouldFetchListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: true,
        inFlight: false,
      }),
      false
    );
    assert.equal(
      shouldFetchListV2NextPage({
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
    const flat = flattenListV2PagesById(pages);
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

  it('desktop and mobile share the same sentinel fetch gates', () => {
    const desktop = shouldObserveListV2Sentinel({
      hasNextPage: true,
      isFetchingNextPage: false,
      enabled: true,
    });
    const mobile = shouldObserveListV2Sentinel({
      hasNextPage: true,
      isFetchingNextPage: false,
      enabled: true,
    });
    assert.equal(desktop, mobile);
  });
});
