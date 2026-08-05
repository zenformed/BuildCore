import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeCrmProjectsListV2Request } from '@/domain/crm/projectsListV2';
import {
  crmProjectsListV2CountQueryKey,
  crmProjectsListV2PageQueryKey,
  crmProjectsListV2SummariesQueryKey,
} from './projectsListV2QueryKeys';

describe('projectsListV2QueryKeys', () => {
  it('uses normalized fingerprint and sorted summary ids', () => {
    const normalized = normalizeCrmProjectsListV2Request({
      view: 'roots',
      filters: { stageSlugs: ['b', 'a'] },
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;
    const pageKey = crmProjectsListV2PageQueryKey({
      organizationId: 'org',
      request: normalized.request,
      cursor: null,
    });
    assert.ok(pageKey.includes(normalized.request.fingerprint));
    assert.ok(pageKey.includes(null));

    const countKey = crmProjectsListV2CountQueryKey({
      organizationId: 'org',
      request: normalized.request,
    });
    assert.ok(countKey.includes('count'));

    const summaries = crmProjectsListV2SummariesQueryKey({
      organizationId: 'org',
      projectIds: ['b', 'a'],
    });
    assert.deepEqual(summaries[3], ['a', 'b']);
  });
});
