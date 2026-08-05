import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeCrmProjectsListV2Request } from '@/domain/crm/projectsListV2';
import { listCrmChildProjectsPageV2 } from './projectsListV2Service';

describe('projectsListV2Service Phase 2A children boundaries', () => {
  it('requires children_of_parent view with parentProjectId', async () => {
    const roots = normalizeCrmProjectsListV2Request({ view: 'roots' });
    assert.equal(roots.ok, true);
    if (!roots.ok) return;

    await assert.rejects(
      () =>
        listCrmChildProjectsPageV2({
          supabase: {} as never,
          organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          request: roots.request,
        }),
      (err: unknown) => err instanceof Error && /children_of_parent/.test(err.message)
    );
  });
});
