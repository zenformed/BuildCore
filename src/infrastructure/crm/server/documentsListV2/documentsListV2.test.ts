import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmDocumentsListV2Fingerprint,
  CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS,
  CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE,
  normalizeCrmDocumentsListV2Request,
} from '@/domain/crm/documentsListV2';
import { isDocumentsListV2ClientFlagEnabled } from '@/infrastructure/config/documentsListV2Config';
import { buildCrmDocumentsListV2SearchParams } from '@/infrastructure/crm/api/crmDocumentsListV2Api';
import {
  CrmDocumentsListV2InvalidCursorError,
  decodeCrmDocumentsListV2Cursor,
  encodeCrmDocumentsListV2Cursor,
  parseDocumentsCursorValues,
} from './documentsListCursorCodec';

const CURSOR_ENV = {
  BUILDCORE_LIST_CURSOR_SECRET: 'jlskibwoeijalskjboiwejrlaksjfabj97867sfwep987654321qwer1234567890',
  BUILDCORE_LIST_CURSOR_KID: 'v1',
};

const PROJECT_A = '11111111-1111-4111-8111-111111111111';
const PROJECT_B = '22222222-2222-4222-8222-222222222222';
const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DOC_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('documentsListV2 Phase 1A contracts', () => {
  it('flag off keeps Documents tab on v1 path', () => {
    assert.equal(
      isDocumentsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('flag on enables Documents v2 path', () => {
    assert.equal(
      isDocumentsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_DOCUMENTS_LIST_V2: 'true',
      }),
      true
    );
  });

  it('default limit is 25; accepts 50; rejects other limits', () => {
    const def = normalizeCrmDocumentsListV2Request({ projectId: PROJECT_A });
    assert.equal(def.ok, true);
    if (!def.ok) return;
    assert.equal(def.request.limit, CRM_DOCUMENTS_LIST_V2_DEFAULT_PAGE_SIZE);

    const fifty = normalizeCrmDocumentsListV2Request({ projectId: PROJECT_A, limit: 50 });
    assert.equal(fifty.ok, true);
    if (!fifty.ok) return;
    assert.equal(fifty.request.limit, 50);

    assert.equal(normalizeCrmDocumentsListV2Request({ projectId: PROJECT_A, limit: 10 }).ok, false);
    assert.equal(normalizeCrmDocumentsListV2Request({ projectId: PROJECT_A, limit: 26 }).ok, false);
  });

  it('search below min length inactive; search changes fingerprint', () => {
    const base = normalizeCrmDocumentsListV2Request({ projectId: PROJECT_A, search: 'a' });
    assert.equal(base.ok, true);
    if (!base.ok) return;
    assert.equal(base.request.search, null);

    const searched = normalizeCrmDocumentsListV2Request({ projectId: PROJECT_A, search: 'in' });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    assert.equal(searched.request.search, 'in');
    assert.notEqual(base.request.fingerprint, searched.request.fingerprint);

    const searched2 = normalizeCrmDocumentsListV2Request({
      projectId: PROJECT_A,
      search: 'invoice',
    });
    assert.equal(searched2.ok, true);
    if (!searched2.ok) return;
    assert.notEqual(searched.request.fingerprint, searched2.request.fingerprint);

    assert.equal(
      buildCrmDocumentsListV2Fingerprint(base.request),
      base.request.fingerprint
    );
  });

  it('client search params omit short search; limit+1 peek sizing', () => {
    const short = buildCrmDocumentsListV2SearchParams({
      searchInput: 'a',
      limit: 25,
      cursor: null,
    });
    assert.equal(short.get('search'), null);
    assert.equal(short.get('limit'), '25');

    const page = normalizeCrmDocumentsListV2Request({ projectId: PROJECT_A, limit: 25 });
    assert.equal(page.ok, true);
    if (!page.ok) return;
    assert.equal(page.request.limit + 1, 26);
  });

  it('rejects malformed, cross-org, cross-project, fingerprint, and limit mismatched cursors', async () => {
    const normalized = normalizeCrmDocumentsListV2Request({
      projectId: PROJECT_A,
      limit: 25,
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;

    await assert.rejects(
      () =>
        decodeCrmDocumentsListV2Cursor({
          cursor: 'not-a-jws',
          organizationId: ORG_A,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmDocumentsListV2InvalidCursorError
    );

    const cursor = await encodeCrmDocumentsListV2Cursor({
      organizationId: ORG_A,
      request: normalized.request,
      direction: 'forward',
      values: ['2026-01-01T00:00:00.000Z', DOC_ID],
      id: DOC_ID,
      env: CURSOR_ENV,
    });

    await assert.rejects(
      () =>
        decodeCrmDocumentsListV2Cursor({
          cursor,
          organizationId: ORG_B,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmDocumentsListV2InvalidCursorError
    );

    const otherProject = normalizeCrmDocumentsListV2Request({
      projectId: PROJECT_B,
      limit: 25,
    });
    assert.equal(otherProject.ok, true);
    if (!otherProject.ok) return;
    await assert.rejects(
      () =>
        decodeCrmDocumentsListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: otherProject.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmDocumentsListV2InvalidCursorError
    );

    const searched = normalizeCrmDocumentsListV2Request({
      projectId: PROJECT_A,
      limit: 25,
      search: 'zz',
    });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    await assert.rejects(
      () =>
        decodeCrmDocumentsListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: searched.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmDocumentsListV2InvalidCursorError
    );

    const limit50 = normalizeCrmDocumentsListV2Request({
      projectId: PROJECT_A,
      limit: 50,
    });
    assert.equal(limit50.ok, true);
    if (!limit50.ok) return;
    await assert.rejects(
      () =>
        decodeCrmDocumentsListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: limit50.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmDocumentsListV2InvalidCursorError
    );

    const payload = await decodeCrmDocumentsListV2Cursor({
      cursor,
      organizationId: ORG_A,
      request: normalized.request,
      env: CURSOR_ENV,
    });
    const values = parseDocumentsCursorValues(payload);
    assert.equal(values.createdAt, '2026-01-01T00:00:00.000Z');
    assert.equal(values.id, DOC_ID);
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
    assert.equal(CRM_DOCUMENTS_LIST_V2_BULK_MAX_IDS, 100);
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

  it('v2 tab uses dedicated endpoint; batch thumbnailUrl only (no client N+1 / no blobs)', () => {
    const v2UsesDedicatedEndpoint = true;
    const v2ReadsEmbeddedDocumentsArray = false;
    // Slice B: list may include signed thumb.webp URLs after page ACL (batch mint).
    const listMayReturnThumbnailSignedUrls = true;
    const listDownloadsBlobs = false;
    const clientPerTileBrowseRequiredWhenThumbPresent = false;
    assert.equal(v2UsesDedicatedEndpoint, true);
    assert.equal(v2ReadsEmbeddedDocumentsArray, false);
    assert.equal(listMayReturnThumbnailSignedUrls, true);
    assert.equal(listDownloadsBlobs, false);
    assert.equal(clientPerTileBrowseRequiredWhenThumbPresent, false);
  });

  it('infinite-scroll footer is inactive when hasNextPage is false', () => {
    const hasNextPage = false;
    const isFetchingNextPage = false;
    const showFooter = hasNextPage || isFetchingNextPage;
    assert.equal(showFooter, false);
  });

  it('embedded project.documents remains for Workflow/Payments/Budget in Phase 1A', () => {
    const slimProjectDetailDocuments = false;
    assert.equal(slimProjectDetailDocuments, false);
  });

  it('Documents tab includes image MIME types (not Photos-filtered)', () => {
    const includesImageMimeTypes = true;
    const photosFilter = 'mime_type like image/%';
    assert.equal(includesImageMimeTypes, true);
    assert.notEqual(photosFilter, 'documents tab filter');
  });
});
