import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmProjectsListV2Fingerprint,
  normalizeCrmProjectsListV2Request,
} from '@/domain/crm/projectsListV2';
import {
  decodeCrmProjectsListV2Cursor,
  encodeCrmProjectsListV2Cursor,
  CrmProjectsListV2InvalidCursorError,
} from './projectsListCursorCodec';
import { buildCrmProjectsListV2SearchParams } from './projectsListV2Search';
import { parseCrmProjectsListV2Query } from './projectsListV2QueryParams';
import { projectsListV2DisabledResponse } from './projectsListV2FeatureGate';
import { isProjectsListV2EnabledForOrganization } from '@/infrastructure/config/projectsListV2Config';
import { CrmProjectsListV2NotWiredError, listCrmChildProjectsPageV2 } from './projectsListV2Service';

const CURSOR_ENV = {
  BUILDCORE_LIST_CURSOR_SECRET: 'jlskibwoeijalskjboiwejrlaksjfabj97867sfwep987654321qwer1234567890',
  BUILDCORE_LIST_CURSOR_KID: 'v1',
};

describe('projectsListV2 Phase 1A contracts', () => {
  it('search below min length is inactive; identity email/phone prepared when complete', () => {
    assert.deepEqual(buildCrmProjectsListV2SearchParams(null), {
      searchPrefix: null,
      searchEmail: null,
      searchPhone: null,
    });
    const email = buildCrmProjectsListV2SearchParams('brenda@example.com');
    assert.equal(email.searchPrefix, 'brenda@example.com');
    assert.equal(email.searchEmail, 'brenda@example.com');
    const phone = buildCrmProjectsListV2SearchParams('6155551111');
    assert.equal(phone.searchPhone, '6155551111');
  });

  it('changing search or filters changes fingerprint (cursor invalidation)', () => {
    const base = normalizeCrmProjectsListV2Request({ view: 'roots', search: 'ac' });
    assert.equal(base.ok, true);
    if (!base.ok) return;
    const searched = normalizeCrmProjectsListV2Request({ view: 'roots', search: 'ace' });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    assert.notEqual(base.request.fingerprint, searched.request.fingerprint);

    const filtered = normalizeCrmProjectsListV2Request({
      view: 'roots',
      filters: { priorities: ['urgent'] },
    });
    assert.equal(filtered.ok, true);
    if (!filtered.ok) return;
    assert.notEqual(base.request.fingerprint, filtered.request.fingerprint);

    const limitChanged = normalizeCrmProjectsListV2Request({ view: 'roots', limit: 25 });
    assert.equal(limitChanged.ok, true);
    if (!limitChanged.ok) return;
    assert.notEqual(base.request.fingerprint, limitChanged.request.fingerprint);

    // Fingerprint helper stays stable for same canonical input
    assert.equal(
      buildCrmProjectsListV2Fingerprint(base.request),
      base.request.fingerprint
    );
  });

  it('rejects invalid limit and children view on Phase 1A query parser', () => {
    const badLimit = parseCrmProjectsListV2Query(new URLSearchParams('limit=10'));
    assert.equal(badLimit.ok, false);

    const children = parseCrmProjectsListV2Query(new URLSearchParams('view=children_of_parent'));
    assert.equal(children.ok, false);

    const ok = parseCrmProjectsListV2Query(
      new URLSearchParams('limit=50&priorities=urgent&stageSlugs=new-lead,scheduled')
    );
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.equal(ok.request.limit, 50);
    assert.deepEqual(ok.request.filters.priorities, ['urgent']);
    assert.deepEqual(ok.request.filters.stageSlugs, ['new-lead', 'scheduled']);
  });

  it('rejects cross-org and fingerprint-mismatched cursors', async () => {
    const normalized = normalizeCrmProjectsListV2Request({ view: 'roots', limit: 25 });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;

    const orgA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const orgB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const cursor = await encodeCrmProjectsListV2Cursor({
      organizationId: orgA,
      request: normalized.request,
      direction: 'forward',
      values: [1, '2026-01-01T00:00:00.000Z', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'],
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      env: CURSOR_ENV,
    });

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor,
          organizationId: orgB,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      CrmProjectsListV2InvalidCursorError
    );

    const otherSearch = normalizeCrmProjectsListV2Request({
      view: 'roots',
      limit: 25,
      search: 'zz',
    });
    assert.equal(otherSearch.ok, true);
    if (!otherSearch.ok) return;

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor,
          organizationId: orgA,
          request: otherSearch.request,
          env: CURSOR_ENV,
        }),
      CrmProjectsListV2InvalidCursorError
    );

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: 'not-a-jws',
          organizationId: orgA,
          request: normalized.request,
          env: CURSOR_ENV,
        }),
      CrmProjectsListV2InvalidCursorError
    );
  });

  it('feature flag off uses not_found disabled response (no v1 fallback)', () => {
    assert.equal(
      isProjectsListV2EnabledForOrganization('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
        BUILDCORE_PROJECTS_LIST_V2: 'false',
      }),
      false
    );
    const response = projectsListV2DisabledResponse();
    assert.equal(response.status, 404);
  });

  it('child projects page remains not wired in Phase 1A', async () => {
    const normalized = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;
    await assert.rejects(
      () =>
        listCrmChildProjectsPageV2({
          supabase: {} as never,
          organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          request: normalized.request,
        }),
      CrmProjectsListV2NotWiredError
    );
  });
});
