import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
  normalizeCrmProjectsListV2Request,
} from '@/domain/crm/projectsListV2';
import { isProjectsListV2ClientFlagEnabled } from '@/infrastructure/config/projectsListV2Config';
import {
  buildCrmProjectsListV2SearchParams,
  fetchCrmChildProjectsListV2Count,
  fetchCrmChildProjectsListV2Page,
} from '@/infrastructure/crm/api/crmProjectsListV2Api';
import { EMPTY_CRM_PROJECTS_LIST_FILTERS } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import {
  buildCrmProjectsListV2ChildrenRequestFromUi,
  buildCrmProjectsListV2RequestFromUi,
  buildCrmProjectsListV2UrlSearchParams,
  mergeCrmProjectsListV2UrlSearchParams,
  parseCrmProjectsListV2ChildrenUrlState,
} from './crmProjectsListV2UrlState';
import { formatCrmProjectsListV2Range } from './formatCrmProjectsListV2Range';

const PARENT_ID = '11111111-1111-4111-8111-111111111111';

describe('projectsListV2 Phase 2B Subprojects tab contracts', () => {
  it('flag off keeps Subprojects on v1 path', () => {
    assert.equal(
      isProjectsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'false',
      }),
      false
    );
  });

  it('flag on enables Subprojects v2 path', () => {
    assert.equal(
      isProjectsListV2ClientFlagEnabled({
        NEXT_PUBLIC_BUILDCORE_PROJECTS_LIST_V2: 'true',
      }),
      true
    );
  });

  it('children URL round-trips search, filters, limit, cursor, and page index', () => {
    const params = buildCrmProjectsListV2UrlSearchParams({
      searchInput: 'oak',
      filters: {
        ...EMPTY_CRM_PROJECTS_LIST_FILTERS,
        stageSlugs: ['scheduled'],
        priorities: ['urgent'],
        workflowTaskStatuses: ['pending'],
      },
      limit: 25,
      cursor: 'opaque-child-cursor',
      pageIndex: 1,
    });
    assert.equal(params.get('page'), '2');
    const parsed = parseCrmProjectsListV2ChildrenUrlState(params, PARENT_ID);
    assert.equal(parsed.searchInput, 'oak');
    assert.equal(parsed.limit, 25);
    assert.equal(parsed.cursor, 'opaque-child-cursor');
    assert.equal(parsed.pageIndex, 1);
    assert.equal(parsed.request.view, 'children_of_parent');
    assert.equal(parsed.request.parentProjectId, PARENT_ID);
    assert.deepEqual(parsed.filters.stageSlugs, ['scheduled']);
  });

  it('merge preserves unrelated Project-page URL params', () => {
    const current = new URLSearchParams('importSpreadsheet=1&other=keep');
    const listParams = buildCrmProjectsListV2UrlSearchParams({
      searchInput: 'ac',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: 50,
      cursor: null,
    });
    const merged = mergeCrmProjectsListV2UrlSearchParams(current, listParams);
    assert.equal(merged.get('importSpreadsheet'), '1');
    assert.equal(merged.get('other'), 'keep');
    assert.equal(merged.get('q'), 'ac');
  });

  it('search and filter changes produce new fingerprints (page reset)', () => {
    const base = buildCrmProjectsListV2ChildrenRequestFromUi({
      parentProjectId: PARENT_ID,
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
    });
    const searched = buildCrmProjectsListV2ChildrenRequestFromUi({
      parentProjectId: PARENT_ID,
      searchInput: 'ac',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
    });
    const filtered = buildCrmProjectsListV2ChildrenRequestFromUi({
      parentProjectId: PARENT_ID,
      searchInput: '',
      filters: {
        ...EMPTY_CRM_PROJECTS_LIST_FILTERS,
        priorities: ['urgent'],
      },
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
    });
    assert.notEqual(base.fingerprint, searched.fingerprint);
    assert.notEqual(base.fingerprint, filtered.fingerprint);
  });

  it('different parents produce different fingerprints', () => {
    const a = buildCrmProjectsListV2ChildrenRequestFromUi({
      parentProjectId: PARENT_ID,
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: 50,
    });
    const b = buildCrmProjectsListV2ChildrenRequestFromUi({
      parentProjectId: '22222222-2222-4222-8222-222222222222',
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: 50,
    });
    assert.notEqual(a.fingerprint, b.fingerprint);
  });

  it('dashboard roots request builder remains roots-only', () => {
    const roots = buildCrmProjectsListV2RequestFromUi({
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: 50,
    });
    assert.equal(roots.view, 'roots');
    assert.equal(roots.parentProjectId, null);
  });

  it('formats Subprojects range like dashboard', () => {
    assert.equal(
      formatCrmProjectsListV2Range({
        pageItemCount: 25,
        limit: 25,
        totalCount: 29,
        hasPreviousPage: false,
        hasNextPage: true,
        pageIndex: 0,
      }),
      '1–25 of 29'
    );
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

  it('children API search params omit parentProjectId authority', () => {
    const request = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT_ID,
      limit: 25,
    });
    assert.equal(request.ok, true);
    if (!request.ok) return;
    const params = buildCrmProjectsListV2SearchParams(request.request, null);
    assert.equal(params.get('view'), 'children_of_parent');
    assert.equal(params.get('parentProjectId'), null);
  });

  it('child page/count fetch helpers are exported', () => {
    assert.equal(typeof fetchCrmChildProjectsListV2Page, 'function');
    assert.equal(typeof fetchCrmChildProjectsListV2Count, 'function');
  });
});
