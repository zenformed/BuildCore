import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CrmProjectsListV2NotWiredError,
  listCrmChildProjectsPageV2,
  loadCrmProjectsPageSummariesV2,
} from './projectsListV2Service';
import { normalizeCrmProjectsListV2Request } from '@/domain/crm/projectsListV2';

describe('projectsListV2Service Phase 1A boundaries', () => {
  it('keeps child list and page summaries unwired', async () => {
    const normalized = normalizeCrmProjectsListV2Request({
      view: 'children_of_parent',
      parentProjectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;
    const ctx = {
      supabase: {} as never,
      organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      request: normalized.request,
    };
    await assert.rejects(() => listCrmChildProjectsPageV2(ctx), CrmProjectsListV2NotWiredError);
    await assert.rejects(
      () =>
        loadCrmProjectsPageSummariesV2({
          supabase: {} as never,
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          projectIds: [],
        }),
      CrmProjectsListV2NotWiredError
    );
  });
});
