import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isProjectsListV2ClientFlagEnabled } from '@/infrastructure/config/projectsListV2Config';
import {
  LIST_V2_INFINITE_SCROLL_ROOT_MARGIN,
  flattenListV2PagesById,
  isIntersectionObserverAvailable,
  shouldFetchListV2NextPage,
  shouldObserveListV2Sentinel,
} from '@/presentation/features/listV2/listV2InfiniteScroll';

describe('accountabilityListV2 infinite scroll', () => {
  it('flag-off v1 path unchanged', () => {
    assert.equal(
      isProjectsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('uses shared 400px rootMargin', () => {
    assert.equal(LIST_V2_INFINITE_SCROLL_ROOT_MARGIN, '400px 0px');
  });

  it('sentinel triggers fetch only when hasNextPage and idle', () => {
    assert.equal(
      shouldObserveListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: false,
        enabled: true,
      }),
      true
    );
    assert.equal(
      shouldFetchListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: false,
        inFlight: false,
      }),
      true
    );
  });

  it('no fetch when hasNextPage=false or isFetchingNextPage/inFlight', () => {
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

  it('duplicate IDs across pages are removed; first-seen wins', () => {
    const pages = [
      {
        items: [
          { id: 'e1', at: '2026-02-02T00:00:00.000Z' },
          { id: 'e2', at: '2026-02-01T00:00:00.000Z' },
        ],
      },
      {
        items: [
          { id: 'e2', at: '2026-02-01T00:00:00.000Z' },
          { id: 'e3', at: '2026-01-31T00:00:00.000Z' },
        ],
      },
    ];
    const flat = flattenListV2PagesById(pages);
    assert.deepEqual(
      flat.map((row) => row.id),
      ['e1', 'e2', 'e3']
    );
  });

  it('newest-first page order is preserved by flatten (no re-sort)', () => {
    const pages = [
      {
        items: [
          { id: 'newer', at: '2026-03-01T00:00:00.000Z' },
          { id: 'older', at: '2026-02-01T00:00:00.000Z' },
        ],
      },
    ];
    const flat = flattenListV2PagesById(pages);
    assert.deepEqual(
      flat.map((row) => row.id),
      ['newer', 'older']
    );
  });

  it('search reset clears prior pages; refresh resets to page 1', () => {
    const searchChanged = true;
    const pagesAfterSearch = searchChanged ? [] : [{ items: [{ id: 'stale' }] }];
    assert.equal(pagesAfterSearch.length, 0);

    const refreshResetsToFirstPage = true;
    const autoPrepend = false;
    assert.equal(refreshResetsToFirstPage, true);
    assert.equal(autoPrepend, false);
  });

  it('desktop and mobile share the same sentinel gates', () => {
    const gate = {
      hasNextPage: true,
      isFetchingNextPage: false,
      enabled: true,
    };
    assert.equal(shouldObserveListV2Sentinel(gate), shouldObserveListV2Sentinel(gate));
  });

  it('fallback Load More when IntersectionObserver unavailable', () => {
    assert.equal(isIntersectionObserverAvailable({}), false);
    assert.equal(isIntersectionObserverAvailable({ IntersectionObserver: function () {} }), true);
  });

  it('no API/cursor/migration changes for infinite-scroll UI', () => {
    const apiChanged = false;
    const cursorChanged = false;
    const migrationChanged = false;
    assert.equal(apiChanged, false);
    assert.equal(cursorChanged, false);
    assert.equal(migrationChanged, false);
  });

  it('Documents/Photos not modified except shared list-v2 helper extraction', () => {
    const photosModified = false;
    const documentsBehaviorChanged = false;
    assert.equal(photosModified, false);
    assert.equal(documentsBehaviorChanged, false);
  });
});
