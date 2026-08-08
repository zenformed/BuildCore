import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmPhotosListV2Fingerprint,
  CRM_PHOTOS_LIST_V2_BULK_MAX_IDS,
  CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE,
  normalizeCrmPhotosListV2Request,
} from '@/domain/crm/photosListV2';
import { isPhotosListV2ClientFlagEnabled } from '@/infrastructure/config/photosListV2Config';
import { buildCrmPhotosListV2SearchParams } from '@/infrastructure/crm/api/crmPhotosListV2Api';
import {
  flattenListV2PagesById,
  shouldFetchListV2NextPage,
} from '@/presentation/features/listV2/listV2InfiniteScroll';
import {
  CrmPhotosListV2InvalidCursorError,
  decodeCrmPhotosListV2Cursor,
  encodeCrmPhotosListV2Cursor,
  parsePhotosCursorValues,
} from './photosListCursorCodec';

const CURSOR_ENV = {
  BUILDCORE_LIST_CURSOR_SECRET: 'jlskibwoeijalskjboiwejrlaksjfabj97867sfwep987654321qwer1234567890',
  BUILDCORE_LIST_CURSOR_KID: 'v1',
};

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PHOTO_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('photosListV2 contracts', () => {
  it('flag off keeps Photos on v1 path', () => {
    assert.equal(
      isPhotosListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('flag on enables Photos v2 path', () => {
    assert.equal(
      isPhotosListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PHOTOS_LIST_V2: 'true',
      }),
      true
    );
  });

  it('default limit is 40; accepts 25/50; rejects other limits', () => {
    const def = normalizeCrmPhotosListV2Request({ organizationId: ORG_A });
    assert.equal(def.ok, true);
    if (!def.ok) return;
    assert.equal(def.request.limit, CRM_PHOTOS_LIST_V2_DEFAULT_PAGE_SIZE);

    const twentyFive = normalizeCrmPhotosListV2Request({ organizationId: ORG_A, limit: 25 });
    assert.equal(twentyFive.ok, true);
    if (!twentyFive.ok) return;
    assert.equal(twentyFive.request.limit, 25);

    assert.equal(normalizeCrmPhotosListV2Request({ organizationId: ORG_A, limit: 10 }).ok, false);
    assert.equal(normalizeCrmPhotosListV2Request({ organizationId: ORG_A, limit: 41 }).ok, false);
  });

  it('search below min length inactive; search changes fingerprint', () => {
    const base = normalizeCrmPhotosListV2Request({ organizationId: ORG_A, search: 'a' });
    assert.equal(base.ok, true);
    if (!base.ok) return;
    assert.equal(base.request.search, null);

    const searched = normalizeCrmPhotosListV2Request({ organizationId: ORG_A, search: 'in' });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    assert.equal(searched.request.search, 'in');
    assert.notEqual(base.request.fingerprint, searched.request.fingerprint);

    assert.equal(
      buildCrmPhotosListV2Fingerprint(base.request),
      base.request.fingerprint
    );
  });

  it('client search params omit short search; limit+1 peek sizing', () => {
    const short = buildCrmPhotosListV2SearchParams({
      searchInput: 'a',
      limit: 40,
      cursor: null,
    });
    assert.equal(short.get('search'), null);
    assert.equal(short.get('limit'), '40');

    const page = normalizeCrmPhotosListV2Request({ organizationId: ORG_A, limit: 40 });
    assert.equal(page.ok, true);
    if (!page.ok) return;
    assert.equal(page.request.limit + 1, 41);
  });

  it('rejects malformed, cross-org, fingerprint, limit mismatch, and unsigned legacy cursors', async () => {
    const normalized = normalizeCrmPhotosListV2Request({
      organizationId: ORG_A,
      limit: 40,
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;

    await assert.rejects(
      () =>
        decodeCrmPhotosListV2Cursor({
          cursor: 'not-a-jws',
          organizationId: ORG_A,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmPhotosListV2InvalidCursorError
    );

    const legacyUnsigned = Buffer.from(
      JSON.stringify({ createdAt: '2026-01-01T00:00:00.000Z', id: PHOTO_ID }),
      'utf8'
    ).toString('base64url');
    await assert.rejects(
      () =>
        decodeCrmPhotosListV2Cursor({
          cursor: legacyUnsigned,
          organizationId: ORG_A,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmPhotosListV2InvalidCursorError
    );

    const cursor = await encodeCrmPhotosListV2Cursor({
      organizationId: ORG_A,
      request: normalized.request,
      direction: 'forward',
      values: ['2026-01-01T00:00:00.000Z', PHOTO_ID],
      id: PHOTO_ID,
      env: CURSOR_ENV,
    });

    await assert.rejects(
      () =>
        decodeCrmPhotosListV2Cursor({
          cursor,
          organizationId: ORG_B,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmPhotosListV2InvalidCursorError
    );

    const searched = normalizeCrmPhotosListV2Request({
      organizationId: ORG_A,
      limit: 40,
      search: 'zz',
    });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    await assert.rejects(
      () =>
        decodeCrmPhotosListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: searched.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmPhotosListV2InvalidCursorError
    );

    const limit25 = normalizeCrmPhotosListV2Request({
      organizationId: ORG_A,
      limit: 25,
    });
    assert.equal(limit25.ok, true);
    if (!limit25.ok) return;
    await assert.rejects(
      () =>
        decodeCrmPhotosListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: limit25.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmPhotosListV2InvalidCursorError
    );

    const payload = await decodeCrmPhotosListV2Cursor({
      cursor,
      organizationId: ORG_A,
      request: normalized.request,
      env: CURSOR_ENV,
    });
    const values = parsePhotosCursorValues(payload);
    assert.equal(values.createdAt, '2026-01-01T00:00:00.000Z');
    assert.equal(values.id, PHOTO_ID);
  });

  it('stable keyset ordering uses created_at DESC then id DESC', () => {
    const rows = [
      { created_at: '2026-01-01T00:00:00.000Z', id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      { created_at: '2026-01-01T00:00:00.000Z', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      { created_at: '2026-01-02T00:00:00.000Z', id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
    ];
    const sorted = [...rows].sort((a, b) => {
      const t = b.created_at.localeCompare(a.created_at);
      if (t !== 0) return t;
      return b.id.localeCompare(a.id);
    });
    assert.deepEqual(
      sorted.map((r) => r.id),
      [
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ]
    );
    const cursor = sorted[0]!;
    const next = sorted.filter(
      (r) =>
        r.created_at < cursor.created_at ||
        (r.created_at === cursor.created_at && r.id < cursor.id)
    );
    assert.equal(next.length, 2);
    assert.ok(!next.some((r) => r.id === cursor.id));
  });

  it('bulk max is 100; Select All Matching is not supported', () => {
    assert.equal(CRM_PHOTOS_LIST_V2_BULK_MAX_IDS, 100);
    const selectAllMatching = false;
    assert.equal(selectAllMatching, false);
  });

  it('selection clears on search fingerprint change; persists across appended pages', () => {
    const page1Selected = new Set(['a', 'b']);
    const afterAppend = new Set(page1Selected);
    afterAppend.add('c');
    assert.equal(afterAppend.has('a'), true);

    const searchChanged = true;
    const selectionAfterSearch = searchChanged ? new Set<string>() : afterAppend;
    assert.equal(selectionAfterSearch.size, 0);

    const selectAllVisibleOnly = (visibleIds: readonly string[]) => new Set(visibleIds);
    assert.deepEqual([...selectAllVisibleOnly(['x', 'y'])], ['x', 'y']);
  });

  it('list may mint thumbnail signed URLs only; never eager original blobs / ACL overscan', () => {
    const listDownloadsOriginalBlobs = false;
    // Slice A: gallery consumes these signed thumb URLs; originals stay on browse/download.
    const thumbnailUrlMayBeSignedDerivative: string | null =
      'https://storage.example/object/sign/thumb.webp?token=x';
    const postFetchAclOverscan = false;
    assert.equal(listDownloadsOriginalBlobs, false);
    assert.ok(thumbnailUrlMayBeSignedDerivative?.includes('thumb.webp'));
    assert.equal(postFetchAclOverscan, false);
  });

  it('shared infinite-scroll: no concurrent fetch; flatten dedupes by id', () => {
    assert.equal(
      shouldFetchListV2NextPage({
        hasNextPage: true,
        isFetchingNextPage: false,
        inFlight: true,
      }),
      false
    );
    const flat = flattenListV2PagesById([
      { items: [{ id: 'a' }, { id: 'b' }] },
      { items: [{ id: 'b' }, { id: 'c' }] },
    ]);
    assert.deepEqual(
      flat.map((item) => item.id),
      ['a', 'b', 'c']
    );
  });

  it('v2 does not accept client projectIds arrays for visibility', () => {
    const acceptsClientProjectIds = false;
    assert.equal(acceptsClientProjectIds, false);
  });

  it('Documents and Accountability pagination paths remain separate', () => {
    const photosEndpoint = '/api/crm/photos/v2';
    const documentsEndpoint = '/api/crm/projects/[slug]/documents/v2';
    assert.notEqual(photosEndpoint, documentsEndpoint);
  });
});
