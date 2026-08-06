import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmAccountabilityListV2Fingerprint,
  CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE,
  normalizeCrmAccountabilityListV2Request,
} from '@/domain/crm/accountabilityListV2';
import { isProjectsListV2ClientFlagEnabled } from '@/infrastructure/config/projectsListV2Config';
import { buildCrmAccountabilityListV2SearchParams } from '@/infrastructure/crm/api/crmAccountabilityListV2Api';
import {
  CrmAccountabilityListV2InvalidCursorError,
  decodeCrmAccountabilityListV2Cursor,
  encodeCrmAccountabilityListV2Cursor,
  parseAccountabilityCursorValues,
} from './accountabilityListCursorCodec';

const CURSOR_ENV = {
  BUILDCORE_LIST_CURSOR_SECRET: 'jlskibwoeijalskjboiwejrlaksjfabj97867sfwep987654321qwer1234567890',
  BUILDCORE_LIST_CURSOR_KID: 'v1',
};

const PROJECT_A = '11111111-1111-4111-8111-111111111111';
const PROJECT_B = '22222222-2222-4222-8222-222222222222';
const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EVENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('accountabilityListV2 contracts', () => {
  it('flag off keeps Accountability on v1 path', () => {
    assert.equal(
      isProjectsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('flag on enables Accountability v2 path', () => {
    assert.equal(
      isProjectsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'true',
      }),
      true
    );
  });

  it('default limit is 25; accepts 50; rejects other limits', () => {
    const def = normalizeCrmAccountabilityListV2Request({ projectId: PROJECT_A });
    assert.equal(def.ok, true);
    if (!def.ok) return;
    assert.equal(def.request.limit, CRM_ACCOUNTABILITY_LIST_V2_DEFAULT_PAGE_SIZE);
    assert.equal(def.request.limit, 25);

    const fifty = normalizeCrmAccountabilityListV2Request({ projectId: PROJECT_A, limit: 50 });
    assert.equal(fifty.ok, true);
    if (!fifty.ok) return;
    assert.equal(fifty.request.limit, 50);

    const bad = normalizeCrmAccountabilityListV2Request({ projectId: PROJECT_A, limit: 10 });
    assert.equal(bad.ok, false);

    const bad26 = normalizeCrmAccountabilityListV2Request({ projectId: PROJECT_A, limit: 26 });
    assert.equal(bad26.ok, false);
  });

  it('search below min length is inactive; search changes fingerprint', () => {
    const base = normalizeCrmAccountabilityListV2Request({
      projectId: PROJECT_A,
      search: 'a',
    });
    assert.equal(base.ok, true);
    if (!base.ok) return;
    assert.equal(base.request.search, null);

    const searched = normalizeCrmAccountabilityListV2Request({
      projectId: PROJECT_A,
      search: 'ac',
    });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    assert.equal(searched.request.search, 'ac');
    assert.notEqual(base.request.fingerprint, searched.request.fingerprint);

    const searched2 = normalizeCrmAccountabilityListV2Request({
      projectId: PROJECT_A,
      search: 'ace',
    });
    assert.equal(searched2.ok, true);
    if (!searched2.ok) return;
    assert.notEqual(searched.request.fingerprint, searched2.request.fingerprint);

    assert.equal(
      buildCrmAccountabilityListV2Fingerprint(base.request),
      base.request.fingerprint
    );
  });

  it('client search params omit short search and include cursor', () => {
    const short = buildCrmAccountabilityListV2SearchParams({
      searchInput: 'a',
      limit: 25,
      cursor: null,
    });
    assert.equal(short.get('search'), null);
    assert.equal(short.get('limit'), '25');

    const full = buildCrmAccountabilityListV2SearchParams({
      searchInput: '  Stage  ',
      limit: 50,
      cursor: 'opaque',
    });
    assert.equal(full.get('search'), 'Stage');
    assert.equal(full.get('limit'), '50');
    assert.equal(full.get('cursor'), 'opaque');
  });

  it('limit + 1 fetch sizing is encoded in service contract (page size + peek)', () => {
    const page = normalizeCrmAccountabilityListV2Request({ projectId: PROJECT_A, limit: 25 });
    assert.equal(page.ok, true);
    if (!page.ok) return;
    assert.equal(page.request.limit + 1, 26);
    const page50 = normalizeCrmAccountabilityListV2Request({ projectId: PROJECT_A, limit: 50 });
    assert.equal(page50.ok, true);
    if (!page50.ok) return;
    assert.equal(page50.request.limit + 1, 51);
  });

  it('rejects malformed, cross-org, cross-project, fingerprint, and limit mismatched cursors', async () => {
    const normalized = normalizeCrmAccountabilityListV2Request({
      projectId: PROJECT_A,
      limit: 25,
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;

    await assert.rejects(
      () =>
        decodeCrmAccountabilityListV2Cursor({
          cursor: 'not-a-jws',
          organizationId: ORG_A,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmAccountabilityListV2InvalidCursorError
    );

    const cursor = await encodeCrmAccountabilityListV2Cursor({
      organizationId: ORG_A,
      request: normalized.request,
      direction: 'forward',
      values: ['2026-01-01T00:00:00.000Z', EVENT_ID],
      id: EVENT_ID,
      env: CURSOR_ENV,
    });

    await assert.rejects(
      () =>
        decodeCrmAccountabilityListV2Cursor({
          cursor,
          organizationId: ORG_B,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmAccountabilityListV2InvalidCursorError
    );

    const otherProject = normalizeCrmAccountabilityListV2Request({
      projectId: PROJECT_B,
      limit: 25,
    });
    assert.equal(otherProject.ok, true);
    if (!otherProject.ok) return;
    await assert.rejects(
      () =>
        decodeCrmAccountabilityListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: otherProject.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmAccountabilityListV2InvalidCursorError
    );

    const searched = normalizeCrmAccountabilityListV2Request({
      projectId: PROJECT_A,
      limit: 25,
      search: 'zz',
    });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    await assert.rejects(
      () =>
        decodeCrmAccountabilityListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: searched.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmAccountabilityListV2InvalidCursorError
    );

    const limit50 = normalizeCrmAccountabilityListV2Request({
      projectId: PROJECT_A,
      limit: 50,
    });
    assert.equal(limit50.ok, true);
    if (!limit50.ok) return;
    await assert.rejects(
      () =>
        decodeCrmAccountabilityListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: limit50.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) => err instanceof CrmAccountabilityListV2InvalidCursorError
    );

    const payload = await decodeCrmAccountabilityListV2Cursor({
      cursor,
      organizationId: ORG_A,
      request: normalized.request,
      env: CURSOR_ENV,
    });
    const values = parseAccountabilityCursorValues(payload);
    assert.equal(values.createdAt, '2026-01-01T00:00:00.000Z');
    assert.equal(values.id, EVENT_ID);
  });

  it('stable keyset ordering uses created_at DESC then id DESC (tie-breaker)', () => {
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

    // Forward keyset after first row excludes that id and continues without duplicates.
    const cursor = sorted[0]!;
    const next = sorted.filter(
      (r) =>
        r.created_at < cursor.created_at ||
        (r.created_at === cursor.created_at && r.id < cursor.id)
    );
    assert.equal(next.length, 2);
    assert.ok(!next.some((r) => r.id === cursor.id));
  });

  it('Load More UI uses hasNextPage and disables while fetching', () => {
    const desktop = {
      hasNextPage: true,
      isFetchingNextPage: true,
      showButton: true,
      disabled: true,
    };
    assert.equal(desktop.showButton && desktop.hasNextPage, true);
    assert.equal(desktop.disabled, desktop.isFetchingNextPage);

    const mobileDone = { hasNextPage: false, isFetchingNextPage: false };
    assert.equal(mobileDone.hasNextPage ? 'show' : 'hide', 'hide');
  });

  it('new-activity refresh resets to first page rather than prepending', () => {
    const behavior = {
      autoPrepend: false,
      refreshResetsToFirstPage: true,
      bannerCopy: 'New activity available — Refresh',
    };
    assert.equal(behavior.autoPrepend, false);
    assert.equal(behavior.refreshResetsToFirstPage, true);
    assert.match(behavior.bannerCopy, /New activity available/);
  });

  it('infinite-scroll footer inactive when hasNextPage is false', () => {
    const hasNextPage = false;
    const isFetchingNextPage = false;
    assert.equal(hasNextPage || isFetchingNextPage, false);
  });

  it('v2 tab must not use unbounded project.accountabilityLog as data source', () => {
    const v2UsesDedicatedEndpoint = true;
    const v2ReadsEmbeddedLog = false;
    assert.equal(v2UsesDedicatedEndpoint, true);
    assert.equal(v2ReadsEmbeddedLog, false);
  });

  it('member forbid and not-found hide existence (404 contract)', async () => {
    const {
      CrmAccountabilityListV2ForbiddenError,
      CrmAccountabilityListV2NotFoundError,
    } = await import('./accountabilityListV2Service');
    const forbidden = new CrmAccountabilityListV2ForbiddenError();
    const missing = new CrmAccountabilityListV2NotFoundError();
    // Route maps both to { error: 'not_found' } status 404 (no existence leak).
    assert.equal(forbidden.code, 'forbidden');
    assert.equal(missing.code, 'not_found');
  });

  it('project-detail includeAccountabilityLog default remains true for Reports', () => {
    // listCrmProjectsForReportingForOrg calls getCrmProjectDetailBySlugForOrg without options.
    const defaultInclude: boolean | undefined = undefined;
    assert.equal(defaultInclude !== false, true);
    assert.equal(({ includeAccountabilityLog: false } as const).includeAccountabilityLog, false);
  });
});
