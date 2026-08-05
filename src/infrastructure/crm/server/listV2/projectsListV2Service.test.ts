import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countCrmProjectsListV2,
  CrmProjectsListV2NotWiredError,
  listCrmChildProjectsPageV2,
  listCrmRootProjectsPageV2,
  loadCrmProjectsPageSummariesV2,
} from './projectsListV2Service';
import { normalizeCrmProjectsListV2Request } from '@/domain/crm/projectsListV2';

describe('projectsListV2Service Phase 0 boundaries', () => {
  it('does not pretend to paginate — throws not-wired', async () => {
    const normalized = normalizeCrmProjectsListV2Request({ view: 'roots' });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) return;
    const ctx = {
      supabase: {} as never,
      organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      request: normalized.request,
    };
    await assert.rejects(() => listCrmRootProjectsPageV2(ctx), CrmProjectsListV2NotWiredError);
    await assert.rejects(() => listCrmChildProjectsPageV2(ctx), CrmProjectsListV2NotWiredError);
    await assert.rejects(() => countCrmProjectsListV2(ctx), CrmProjectsListV2NotWiredError);
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
