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

describe('documentsListV2 infinite scroll (aliases over shared list-v2)', () => {
  it('v1 path remains when client flag is off', () => {
    assert.equal(
      isDocumentsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('aliases the shared 400px rootMargin', () => {
    assert.equal(DOCUMENTS_LIST_V2_INFINITE_SCROLL_ROOT_MARGIN, '400px 0px');
  });

  it('aliases observe / fetch gates and flatten helpers', () => {
    assert.equal(
      shouldObserveDocumentsListV2Sentinel({
        hasNextPage: true,
        isFetchingNextPage: false,
        enabled: true,
      }),
      true
    );
    assert.equal(
      shouldFetchDocumentsListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: true,
        inFlight: false,
      }),
      false
    );
    assert.deepEqual(
      flattenDocumentsListV2PagesById([
        { items: [{ id: 'a' }, { id: 'b' }] },
        { items: [{ id: 'b' }, { id: 'c' }] },
      ]).map((row) => row.id),
      ['a', 'b', 'c']
    );
    assert.equal(isIntersectionObserverAvailable({}), false);
  });
});
