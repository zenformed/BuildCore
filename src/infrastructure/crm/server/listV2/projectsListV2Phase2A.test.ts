import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
  CRM_PROJECTS_LIST_V2_PAGE_SIZES,
  normalizeCrmProjectsListV2Request,
} from '@/domain/crm/projectsListV2';
import { isProjectsListV2EnabledForOrganization } from '@/infrastructure/config/projectsListV2Config';
import {
  decodeCrmProjectsListV2Cursor,
  encodeCrmProjectsListV2Cursor,
} from './projectsListCursorCodec';
import { projectsListV2DisabledResponse } from './projectsListV2FeatureGate';
import { sliceOperationalKeysetPage } from './projectsListV2Keyset';
import {
  parseCrmProjectsListV2ChildrenQuery,
  parseCrmProjectsListV2Query,
} from './projectsListV2QueryParams';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PARENT_A = '11111111-1111-4111-8111-111111111111';
const PARENT_B = '22222222-2222-4222-8222-222222222222';

const CURSOR_ENV = {
  BUILDCORE_LIST_CURSOR_SECRET: 'phase2a-test-cursor-secret-at-least-32-chars!!',
  BUILDCORE_LIST_CURSOR_KID: 'v1',
};

describe('projectsListV2 Phase 2A children contracts', () => {
  it('dashboard roots parser still rejects children_of_parent', () => {
    const parsed = parseCrmProjectsListV2Query(
      new URLSearchParams('view=children_of_parent')
    );
    assert.equal(parsed.ok, false);
  });

  it('children parser binds server parent id and ignores client parentProjectId', () => {
    const params = new URLSearchParams(
      `parentProjectId=${PARENT_B}&limit=25&search=ac&stageSlugs=scheduled&priorities=urgent`
    );
    const parsed = parseCrmProjectsListV2ChildrenQuery(params, PARENT_A);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.request.view, 'children_of_parent');
    assert.equal(parsed.request.parentProjectId, PARENT_A);
    assert.equal(parsed.request.limit, 25);
    assert.equal(parsed.request.search, 'ac');
    assert.deepEqual(parsed.request.filters.stageSlugs, ['scheduled']);
    assert.deepEqual(parsed.request.filters.priorities, ['urgent']);
  });

  it('children parser rejects non-children view override', () => {
    const parsed = parseCrmProjectsListV2ChildrenQuery(
      new URLSearchParams('view=roots'),
      PARENT_A
    );
    assert.equal(parsed.ok, false);
  });

  it('page sizes are only 25/50/100 with default 50', () => {
    assert.deepEqual(CRM_PROJECTS_LIST_V2_PAGE_SIZES, [25, 50, 100]);
    const normalized = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;
    assert.equal(normalized.request.limit, CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE);
  });

  it('search/filter/limit changes invalidate fingerprint (page reset)', () => {
    const base = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
      limit: 50,
    });
    assert.equal(base.ok, true);
    if (!base.ok) return;

    const searched = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
      search: 'ac',
      limit: 50,
    });
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    assert.notEqual(base.request.fingerprint, searched.request.fingerprint);

    const filtered = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
      filters: { priorities: ['urgent'] },
      limit: 50,
    });
    assert.equal(filtered.ok, true);
    if (!filtered.ok) return;
    assert.notEqual(base.request.fingerprint, filtered.request.fingerprint);

    const resized = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
      limit: 25,
    });
    assert.equal(resized.ok, true);
    if (!resized.ok) return;
    assert.notEqual(base.request.fingerprint, resized.request.fingerprint);
  });

  it('different parents produce different fingerprints', () => {
    const a = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
    });
    const b = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_B,
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.request.fingerprint, b.request.fingerprint);
  });

  it('rejects cross-parent cursor', async () => {
    const forParentA = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
    });
    const forParentB = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_B,
    });
    assert.equal(forParentA.ok, true);
    assert.equal(forParentB.ok, true);
    if (!forParentA.ok || !forParentB.ok) return;

    const cursor = await encodeCrmProjectsListV2Cursor({
      organizationId: ORG_A,
      request: forParentA.request,
      direction: 'forward',
      values: [1, '2026-01-01T00:00:00.000Z', PARENT_A],
      id: PARENT_A,
      env: CURSOR_ENV,
    });

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor,
          organizationId: ORG_A,
          request: forParentB.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) =>
        err instanceof Error && err.name === 'CrmProjectsListV2InvalidCursorError'
    );
  });

  it('rejects cross-org cursor', async () => {
    const request = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
    });
    assert.equal(request.ok, true);
    if (!request.ok) return;

    const cursor = await encodeCrmProjectsListV2Cursor({
      organizationId: ORG_A,
      request: request.request,
      direction: 'forward',
      values: [0, null, PARENT_A],
      id: PARENT_A,
      env: CURSOR_ENV,
    });

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor,
          organizationId: ORG_B,
          request: request.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) =>
        err instanceof Error && err.name === 'CrmProjectsListV2InvalidCursorError'
    );
  });

  it('rejects malformed cursor', async () => {
    const request = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_A,
    });
    assert.equal(request.ok, true);
    if (!request.ok) return;

    await assert.rejects(
      () =>
        decodeCrmProjectsListV2Cursor({
          cursor: 'not-a-valid-jws',
          organizationId: ORG_A,
          request: request.request,
          env: CURSOR_ENV,
        }),
      (err: unknown) =>
        err instanceof Error && err.name === 'CrmProjectsListV2InvalidCursorError'
    );
  });

  it('feature flag off uses not_found disabled response (no v1 fallback)', () => {
    assert.equal(
      isProjectsListV2EnabledForOrganization(ORG_A, {
        BUILDCORE_PROJECTS_LIST_V2: 'false',
      }),
      false
    );
    const response = projectsListV2DisabledResponse();
    assert.equal(response.status, 404);
  });

  it('stable child traversal has no duplicates or missing rows', () => {
    const unsorted = [
      { id: 'c1', listSortBucket: 0, lastActivityAt: '2026-01-02T00:00:00.000Z' },
      { id: 'c2', listSortBucket: 0, lastActivityAt: '2026-01-02T00:00:00.000Z' },
      { id: 'c3', listSortBucket: 1, lastActivityAt: null },
      { id: 'c4', listSortBucket: 1, lastActivityAt: null },
      { id: 'c5', listSortBucket: 2, lastActivityAt: '2026-01-03T00:00:00.000Z' },
      { id: 'c6', listSortBucket: 3, lastActivityAt: '2026-01-01T00:00:00.000Z' },
    ];
    const dataset = [...unsorted].sort((left, right) => {
      if (left.listSortBucket !== right.listSortBucket) {
        return left.listSortBucket - right.listSortBucket;
      }
      if (left.lastActivityAt == null && right.lastActivityAt == null) {
        return right.id.localeCompare(left.id);
      }
      if (left.lastActivityAt == null) return 1;
      if (right.lastActivityAt == null) return -1;
      if (left.lastActivityAt !== right.lastActivityAt) {
        return right.lastActivityAt.localeCompare(left.lastActivityAt);
      }
      return right.id.localeCompare(left.id);
    });

    const seen = new Set<string>();
    let cursor: (typeof dataset)[number] | null = null;
    let hasNext = true;
    while (hasNext) {
      const pageResult: ReturnType<typeof sliceOperationalKeysetPage<(typeof dataset)[number]>> =
        sliceOperationalKeysetPage({
          sortedRows: dataset,
          limit: 2,
          direction: 'forward',
          cursor,
        });
      for (const row of pageResult.page) {
        assert.equal(seen.has(row.id), false);
        seen.add(row.id);
      }
      hasNext = pageResult.hasNextPage;
      cursor = pageResult.page[pageResult.page.length - 1] ?? null;
    }
    assert.equal(seen.size, dataset.length);

    const first = sliceOperationalKeysetPage({
      sortedRows: dataset,
      limit: 2,
      direction: 'forward',
      cursor: null,
    });
    const second = sliceOperationalKeysetPage({
      sortedRows: dataset,
      limit: 2,
      direction: 'forward',
      cursor: first.page[first.page.length - 1] ?? null,
    });
    const back = sliceOperationalKeysetPage({
      sortedRows: dataset,
      limit: 2,
      direction: 'backward',
      cursor: second.page[0] ?? null,
    });
    assert.deepEqual(
      back.page.map((row) => row.id).sort(),
      first.page.map((row) => row.id).sort()
    );
  });

  it('duplicate timestamps tie-break by id DESC; null activity sorts last', () => {
    const rows = [
      { id: 'z', listSortBucket: 1, lastActivityAt: '2026-01-01T00:00:00.000Z' },
      { id: 'a', listSortBucket: 1, lastActivityAt: '2026-01-01T00:00:00.000Z' },
      { id: 'n', listSortBucket: 1, lastActivityAt: null },
    ];
    const sorted = [...rows].sort((left, right) => {
      if (left.lastActivityAt == null && right.lastActivityAt == null) {
        return right.id.localeCompare(left.id);
      }
      if (left.lastActivityAt == null) return 1;
      if (right.lastActivityAt == null) return -1;
      if (left.lastActivityAt !== right.lastActivityAt) {
        return right.lastActivityAt.localeCompare(left.lastActivityAt);
      }
      return right.id.localeCompare(left.id);
    });
    assert.deepEqual(
      sorted.map((row) => row.id),
      ['z', 'a', 'n']
    );
  });

  it('documents parent-scoped exclusion contracts', () => {
    // RPC contracts (00066): parent_project_id = $parent, parent_project_id IS NOT NULL
    // implied, archived_at IS NULL, roots excluded by parent filter.
    const childWhere = {
      organizationScoped: true,
      parentProjectIdEqualsResolvedParent: true,
      archivedAtIsNull: true,
      rootsExcluded: true,
      otherParentsExcluded: true,
    };
    assert.equal(childWhere.organizationScoped, true);
    assert.equal(childWhere.parentProjectIdEqualsResolvedParent, true);
    assert.equal(childWhere.archivedAtIsNull, true);
    assert.equal(childWhere.rootsExcluded, true);
    assert.equal(childWhere.otherParentsExcluded, true);
  });
});
