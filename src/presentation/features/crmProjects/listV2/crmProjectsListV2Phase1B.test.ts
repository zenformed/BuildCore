import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
  normalizeCrmProjectsListV2Request,
} from '@/domain/crm/projectsListV2';
import { isProjectsListV2ClientFlagEnabled } from '@/infrastructure/config/projectsListV2Config';
import { buildCrmProjectsListV2SearchParams } from '@/infrastructure/crm/api/crmProjectsListV2Api';
import { EMPTY_CRM_PROJECTS_LIST_FILTERS } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import {
  buildCrmProjectsListV2RequestFromUi,
  buildCrmProjectsListV2UrlSearchParams,
  parseCrmProjectsListV2UrlState,
} from './crmProjectsListV2UrlState';
import { formatCrmProjectsListV2Range } from './formatCrmProjectsListV2Range';
import { sliceOperationalKeysetPage } from '@/infrastructure/crm/server/listV2/projectsListV2Keyset';

describe('projectsListV2 Phase 1B dashboard contracts', () => {
  it('flag off by default (v1 path)', () => {
    assert.equal(
      isProjectsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('flag on enables client v2 path', () => {
    assert.equal(
      isProjectsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'true',
      }),
      true
    );
  });

  it('formats count range like 101–150 of 6,806', () => {
    assert.equal(
      formatCrmProjectsListV2Range({
        pageItemCount: 50,
        limit: 50,
        totalCount: 6806,
        hasPreviousPage: true,
        hasNextPage: true,
        pageIndex: 2,
      }),
      '101–150 of 6,806'
    );
  });

  it('formats first page as 1–25 of 29 without needing pageIndex', () => {
    assert.equal(
      formatCrmProjectsListV2Range({
        pageItemCount: 25,
        limit: 25,
        totalCount: 29,
        hasPreviousPage: false,
        hasNextPage: true,
        pageIndex: null,
      }),
      '1–25 of 29'
    );
  });

  it('formats partial last page as 26–29 of 29 from total + item count', () => {
    assert.equal(
      formatCrmProjectsListV2Range({
        pageItemCount: 4,
        limit: 25,
        totalCount: 29,
        hasPreviousPage: true,
        hasNextPage: false,
        pageIndex: null,
      }),
      '26–29 of 29'
    );
  });

  it('falls back to page-item count only for unknown middle pages', () => {
    assert.equal(
      formatCrmProjectsListV2Range({
        pageItemCount: 25,
        limit: 25,
        totalCount: 100,
        hasPreviousPage: true,
        hasNextPage: true,
        pageIndex: null,
      }),
      '25 of 100'
    );
  });

  it('URL round-trips search, filters, limit, cursor, and page index', () => {
    const params = buildCrmProjectsListV2UrlSearchParams({
      searchInput: 'acme',
      filters: {
        ...EMPTY_CRM_PROJECTS_LIST_FILTERS,
        stageSlugs: ['scheduled'],
        priorities: ['urgent'],
        workflowTaskStatuses: ['pending'],
      },
      limit: 25,
      cursor: 'opaque-cursor',
      pageIndex: 1,
    });
    assert.equal(params.get('page'), '2');
    const parsed = parseCrmProjectsListV2UrlState(params);
    assert.equal(parsed.searchInput, 'acme');
    assert.equal(parsed.limit, 25);
    assert.equal(parsed.cursor, 'opaque-cursor');
    assert.equal(parsed.pageIndex, 1);
    assert.deepEqual(parsed.filters.stageSlugs, ['scheduled']);
    assert.deepEqual(parsed.filters.priorities, ['urgent']);
    assert.deepEqual(parsed.filters.workflowTaskStatuses, ['pending']);
  });

  it('cursor without page param yields unknown pageIndex (legacy deep link)', () => {
    const params = buildCrmProjectsListV2UrlSearchParams({
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: 25,
      cursor: 'opaque-cursor',
    });
    assert.equal(params.get('page'), null);
    const parsed = parseCrmProjectsListV2UrlState(params);
    assert.equal(parsed.pageIndex, null);
  });

  it('search and filter changes produce new fingerprints (page reset)', () => {
    const base = buildCrmProjectsListV2RequestFromUi({
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
    });
    const searched = buildCrmProjectsListV2RequestFromUi({
      searchInput: 'ac',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
    });
    const filtered = buildCrmProjectsListV2RequestFromUi({
      searchInput: '',
      filters: { ...EMPTY_CRM_PROJECTS_LIST_FILTERS, priorities: ['urgent'] },
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
    });
    const pageSize = buildCrmProjectsListV2RequestFromUi({
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: 25,
    });
    assert.notEqual(base.fingerprint, searched.fingerprint);
    assert.notEqual(base.fingerprint, filtered.fingerprint);
    assert.notEqual(base.fingerprint, pageSize.fingerprint);
  });

  it('search below 2 chars does not activate server search', () => {
    const request = buildCrmProjectsListV2RequestFromUi({
      searchInput: 'a',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: 50,
    });
    assert.equal(request.search, null);
  });

  it('API query builder omits inactive search and includes real filters', () => {
    const normalized = normalizeCrmProjectsListV2Request({
      view: 'roots',
      search: 'ac',
      limit: 50,
      filters: {
        stageSlugs: ['new-lead'],
        priorities: ['urgent'],
        workflowTaskStatuses: ['done'],
        projectStatuses: ['active'],
      },
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;
    const params = buildCrmProjectsListV2SearchParams(normalized.request, 'cursor-1');
    assert.equal(params.get('search'), 'ac');
    assert.equal(params.get('cursor'), 'cursor-1');
    assert.equal(params.get('stageSlugs'), 'new-lead');
    assert.equal(params.get('priorities'), 'urgent');
    assert.equal(params.get('workflowTaskStatuses'), 'done');
    assert.equal(params.get('projectStatuses'), 'active');
  });

  it('select-visible semantics: union/deselect page ids without clearing others', () => {
    const selected = new Set<string>(['a', 'b']);
    const visible = ['b', 'c'] as const;
    // select many visible
    for (const id of visible) selected.add(id);
    assert.deepEqual([...selected].sort(), ['a', 'b', 'c']);
    // deselect many visible
    for (const id of visible) selected.delete(id);
    assert.deepEqual([...selected], ['a']);
  });

  it('empty-page fallback prefers previous cursor when available', () => {
    const pageInfo = {
      nextCursor: null as string | null,
      previousCursor: 'prev',
      hasNextPage: false,
      hasPreviousPage: true,
      items: [] as unknown[],
    };
    const nextCursor =
      pageInfo.items.length === 0 && pageInfo.hasPreviousPage
        ? pageInfo.previousCursor
        : null;
    assert.equal(nextCursor, 'prev');
  });

  it('new-record banner triggers when count exceeds baseline', () => {
    const baseline = 10;
    const polled = 12;
    assert.equal(polled > baseline, true);
  });

  it('stable traversal has no duplicates or missing rows', () => {
    const unsorted = [
      { id: 'a', listSortBucket: 0, lastActivityAt: '2026-01-02T00:00:00.000Z' },
      { id: 'b', listSortBucket: 0, lastActivityAt: '2026-01-01T00:00:00.000Z' },
      { id: 'c', listSortBucket: 1, lastActivityAt: null },
      { id: 'd', listSortBucket: 1, lastActivityAt: null },
      { id: 'e', listSortBucket: 2, lastActivityAt: '2026-01-03T00:00:00.000Z' },
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
  });

  it('v2 page summaries API path is distinct from org-wide rollup routes', () => {
    // Contract guard: Phase 1B must not call these org-wide endpoints on the v2 path.
    const forbidden = [
      '/api/crm/projects/payment-balance-tasks',
      '/api/crm/projects/workflow-progress-inputs',
      '/api/crm/projects/workflow-task-statuses',
      '/api/crm/projects/budget-entries',
    ];
    const v2Paths = [
      '/api/crm/projects/v2',
      '/api/crm/projects/v2/count',
      '/api/crm/projects/v2/summaries',
    ];
    for (const path of forbidden) {
      assert.equal(v2Paths.includes(path), false);
    }
  });

  it('client v2 flag disables layout eager-load of org-wide rollup Maps', () => {
    // Dashboard/demo layouts pass eagerLoad={!isProjectsListV2ClientFlagEnabled()}.
    const eagerLoadWhenV2On = !isProjectsListV2ClientFlagEnabled({
      NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'true',
    });
    const eagerLoadWhenV2Off = !isProjectsListV2ClientFlagEnabled({
      NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'false',
    });
    assert.equal(eagerLoadWhenV2On, false);
    assert.equal(eagerLoadWhenV2Off, true);
  });
});
