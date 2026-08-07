import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmProjectsListV2UrlSearchParams,
  parseCrmProjectStatusesUrlParam,
  parseCrmProjectsListV2UrlState,
} from './crmProjectsListV2UrlState';
import { EMPTY_CRM_PROJECTS_LIST_FILTERS } from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE } from '@/domain/crm/projectsListV2';
import { buildCrmProjectsListV2SearchParams } from '@/infrastructure/crm/api/crmProjectsListV2Api';

describe('crmProjectsListV2 projectStatuses URL defaults', () => {
  it('defaults missing projectStatuses to Active', () => {
    assert.deepEqual(parseCrmProjectStatusesUrlParam(null), ['active']);
    assert.deepEqual(parseCrmProjectStatusesUrlParam(''), ['active']);
  });

  it('parses all as empty filter (show every status)', () => {
    assert.deepEqual(parseCrmProjectStatusesUrlParam('all'), []);
  });

  it('parses specific statuses', () => {
    assert.deepEqual(parseCrmProjectStatusesUrlParam('completed'), ['completed']);
    assert.deepEqual(parseCrmProjectStatusesUrlParam('lost,cancelled'), ['lost', 'cancelled']);
  });

  it('omits Active default from URL and writes all explicitly', () => {
    const activeParams = buildCrmProjectsListV2UrlSearchParams({
      searchInput: '',
      filters: EMPTY_CRM_PROJECTS_LIST_FILTERS,
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
      cursor: null,
    });
    assert.equal(activeParams.get('projectStatuses'), null);

    const allParams = buildCrmProjectsListV2UrlSearchParams({
      searchInput: '',
      filters: { ...EMPTY_CRM_PROJECTS_LIST_FILTERS, projectStatuses: [] },
      limit: CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE,
      cursor: null,
    });
    assert.equal(allParams.get('projectStatuses'), 'all');
  });

  it('parses dashboard URL into Active-default request fingerprint filters', () => {
    const state = parseCrmProjectsListV2UrlState(new URLSearchParams());
    assert.deepEqual(state.filters.projectStatuses, ['active']);
    assert.deepEqual(state.request.filters.projectStatuses, ['active']);
  });

  it('API search params send Active default so the BFF can filter Completed', () => {
    const state = parseCrmProjectsListV2UrlState(new URLSearchParams());
    const params = buildCrmProjectsListV2SearchParams(state.request, null);
    assert.equal(params.get('projectStatuses'), 'active');
  });

  it('API search params omit projectStatuses when filter is All', () => {
    const state = parseCrmProjectsListV2UrlState(
      new URLSearchParams('projectStatuses=all')
    );
    assert.deepEqual(state.request.filters.projectStatuses, []);
    const params = buildCrmProjectsListV2SearchParams(state.request, null);
    assert.equal(params.get('projectStatuses'), null);
  });
});
