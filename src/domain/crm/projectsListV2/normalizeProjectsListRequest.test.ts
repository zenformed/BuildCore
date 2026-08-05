import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCrmProjectsListV2Fingerprint,
  normalizeCrmProjectsListV2Request,
  normalizeCrmProjectsListV2Search,
  parseCrmProjectsListV2PageSize,
} from './normalizeProjectsListRequest';
import { CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE } from './types';

const PARENT = '11111111-1111-4111-8111-111111111111';

describe('normalizeCrmProjectsListV2Search', () => {
  it('requires at least 2 characters after trim', () => {
    assert.equal(normalizeCrmProjectsListV2Search(''), null);
    assert.equal(normalizeCrmProjectsListV2Search(' a '), null);
    assert.equal(normalizeCrmProjectsListV2Search('Ab'), 'ab');
  });
});

describe('parseCrmProjectsListV2PageSize', () => {
  it('accepts only 25, 50, 100', () => {
    assert.equal(parseCrmProjectsListV2PageSize(25), 25);
    assert.equal(parseCrmProjectsListV2PageSize('50'), 50);
    assert.equal(parseCrmProjectsListV2PageSize(100), 100);
    assert.equal(parseCrmProjectsListV2PageSize(75), CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE);
    assert.equal(parseCrmProjectsListV2PageSize('nope'), CRM_PROJECTS_LIST_V2_DEFAULT_PAGE_SIZE);
  });
});

describe('normalizeCrmProjectsListV2Request', () => {
  it('defaults roots view, operational sort, limit 50', () => {
    const result = normalizeCrmProjectsListV2Request({});
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.request.view, 'roots');
    assert.equal(result.request.sort, 'operational');
    assert.equal(result.request.limit, 50);
    assert.equal(result.request.parentProjectId, null);
    assert.equal(result.request.search, null);
  });

  it('rejects invalid page sizes', () => {
    const result = normalizeCrmProjectsListV2Request({ limit: 40 });
    assert.equal(result.ok, false);
  });

  it('requires parentProjectId for children_of_parent', () => {
    const missing = normalizeCrmProjectsListV2Request({ view: 'children_of_parent' });
    assert.equal(missing.ok, false);
    const ok = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: PARENT,
    });
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.equal(ok.request.parentProjectId, PARENT);
  });

  it('produces identical fingerprints when filter array order differs', () => {
    const a = normalizeCrmProjectsListV2Request({
      filters: {
        stageSlugs: ['lead', 'qualified'],
        priorities: ['urgent', 'normal'],
        workflowTaskStatuses: ['done', 'pending'],
        assignedMemberIds: [
          '22222222-2222-4222-8222-222222222222',
          '11111111-1111-4111-8111-111111111111',
        ],
      },
    });
    const b = normalizeCrmProjectsListV2Request({
      filters: {
        stageSlugs: ['qualified', 'lead'],
        priorities: ['normal', 'urgent'],
        workflowTaskStatuses: ['pending', 'done'],
        assignedMemberIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
      },
    });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.request.fingerprint, b.request.fingerprint);
    assert.deepEqual(a.request.filters.stageSlugs, ['lead', 'qualified']);
  });

  it('changes fingerprint when limit, search, sort, or view changes', () => {
    const base = normalizeCrmProjectsListV2Request({ search: 'acme' });
    assert.equal(base.ok, true);
    if (!base.ok) return;
    const limitChange = normalizeCrmProjectsListV2Request({ search: 'acme', limit: 25 });
    const searchChange = normalizeCrmProjectsListV2Request({ search: 'acre' });
    assert.equal(limitChange.ok && searchChange.ok, true);
    if (!limitChange.ok || !searchChange.ok) return;
    assert.notEqual(base.request.fingerprint, limitChange.request.fingerprint);
    assert.notEqual(base.request.fingerprint, searchChange.request.fingerprint);

    const rebuilt = buildCrmProjectsListV2Fingerprint(base.request);
    assert.equal(rebuilt, base.request.fingerprint);
  });
});
