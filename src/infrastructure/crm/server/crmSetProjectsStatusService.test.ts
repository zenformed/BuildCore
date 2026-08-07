import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import type { CrmProjectDetail } from '@/domain/crm';
import { setCrmProjectsStatusForOrg } from './crmSetProjectsStatusService';

type StatusRow = {
  id: string;
  name: string;
  slug: string;
  parent_project_id: string | null;
  assigned_member_id: string | null;
  priority: string;
  completed_at: string | null;
  project_status: string | null;
  loss_reason: string | null;
  loss_reason_other: string | null;
  status_changed_at: string | null;
  subproject_status: string | null;
  inactive_reason: string | null;
  inactive_reason_custom: string | null;
  inactive_at: string | null;
};

function createFakeSupabase(rows: StatusRow[]) {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const client = {
    from(table: string) {
      if (table !== 'crm_projects') {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select() {
          return {
            eq() {
              return {
                in(_col: string, slugs: string[]) {
                  return {
                    is() {
                      const data = rows.filter((row) => slugs.includes(row.slug));
                      return Promise.resolve({ data, error: null });
                    },
                  };
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(col: string, value: string) {
              if (col === 'id') {
                updates.push({ id: value, patch });
              }
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, updates };
}

function baseRow(overrides: Partial<StatusRow> & Pick<StatusRow, 'id' | 'slug'>): StatusRow {
  return {
    name: overrides.slug,
    parent_project_id: null,
    assigned_member_id: null,
    priority: 'normal',
    completed_at: null,
    project_status: 'active',
    loss_reason: null,
    loss_reason_other: null,
    status_changed_at: null,
    subproject_status: 'normal',
    inactive_reason: null,
    inactive_reason_custom: null,
    inactive_at: null,
    ...overrides,
  };
}

function detailStub(slug: string, workflowTasks: CrmProjectDetail['workflowTasks']): CrmProjectDetail {
  return {
    summary: {
      id: `id-${slug}`,
      slug,
      name: slug,
      status: 'active',
    },
    workflowTasks,
    manualStageCompletions: [],
  } as unknown as CrmProjectDetail;
}

describe('setCrmProjectsStatusForOrg', () => {
  it('partially succeeds for mixed Member bulk selection', async () => {
    const rows = [
      baseRow({ id: '1', slug: 'assigned-a', assigned_member_id: 'member-1' }),
      baseRow({ id: '2', slug: 'assigned-b', assigned_member_id: 'member-1' }),
      baseRow({ id: '3', slug: 'unassigned', assigned_member_id: 'other' }),
    ];
    const { client, updates } = createFakeSupabase(rows);
    const accountability: string[] = [];

    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'member-1',
      {
        projectSlugs: ['assigned-a', 'assigned-b', 'unassigned'],
        status: 'cancelled',
        source: 'table_bulk',
      },
      {
        loadActorRole: async () => 'member' as OrganizationMemberRole,
        appendAccountability: async (_sb, input) => {
          accountability.push(String(input.metadata?.slug));
        },
        createBulkOperationId: () => 'bulk-1',
        nowIso: () => '2026-03-01T00:00:00.000Z',
      }
    );

    assert.equal(result.updatedCount, 2);
    assert.equal(result.results[0]?.success, true);
    assert.equal(result.results[1]?.success, true);
    assert.equal(result.results[2]?.failureCode, 'unauthorized');
    assert.equal(updates.length, 2);
    assert.deepEqual(accountability, ['assigned-a', 'assigned-b']);
  });

  it('returns not_found for org-isolated missing slugs', async () => {
    const { client } = createFakeSupabase([baseRow({ id: '1', slug: 'in-org' })]);
    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'owner-1',
      { projectSlugs: ['other-org-slug'], status: 'active' },
      {
        loadActorRole: async () => 'owner',
        appendAccountability: async () => undefined,
      }
    );
    assert.equal(result.results[0]?.failureCode, 'not_found');
    assert.equal(result.results[0]?.previousStatus, null);
  });

  it('blocks Completed when workflow validation fails and continues others', async () => {
    const rows = [
      baseRow({ id: '1', slug: 'blocked' }),
      baseRow({ id: '2', slug: 'ready' }),
    ];
    const { client, updates } = createFakeSupabase(rows);

    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'admin-1',
      { projectSlugs: ['blocked', 'ready'], status: 'completed' },
      {
        loadActorRole: async () => 'admin',
        getProjectDetail: async (_sb, _org, slug) => {
          if (slug === 'blocked') {
            return detailStub(slug, [
              {
                id: 't1',
                status: 'todo',
                stageSlug: 'stage-a',
              } as unknown as CrmProjectDetail['workflowTasks'][number],
            ]);
          }
          return detailStub(slug, [
            {
              id: 't2',
              status: 'done',
              stageSlug: 'stage-a',
            } as unknown as CrmProjectDetail['workflowTasks'][number],
          ]);
        },
        loadPipelineStages: async () => [
          { slug: 'stage-a', label: 'Stage A', sortOrder: 1 },
        ],
        appendAccountability: async () => undefined,
        createBulkOperationId: () => 'bulk-complete',
      }
    );

    assert.equal(result.results[0]?.failureCode, 'completion_blocked');
    assert.ok((result.results[0]?.incompleteStages?.length ?? 0) > 0);
    assert.equal(result.results[1]?.success, true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.patch.project_status, 'completed');
    assert.equal(updates[0]?.patch.subproject_status, 'completed');
  });

  it('does not write or emit accountability for already_at_status', async () => {
    const rows = [
      baseRow({
        id: '1',
        slug: 'already-lost',
        project_status: 'lost',
        loss_reason: 'price',
        loss_reason_other: null,
        subproject_status: 'inactive',
        inactive_reason: 'price',
      }),
    ];
    const { client, updates } = createFakeSupabase(rows);
    let accountabilityCalls = 0;

    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'admin-1',
      {
        projectSlugs: ['already-lost'],
        status: 'lost',
        lossReason: 'price',
      },
      {
        loadActorRole: async () => 'admin',
        appendAccountability: async () => {
          accountabilityCalls += 1;
        },
      }
    );

    assert.equal(result.results[0]?.failureCode, 'already_at_status');
    assert.equal(result.updatedCount, 0);
    assert.equal(updates.length, 0);
    assert.equal(accountabilityCalls, 0);
  });

  it('updates when Lost reason changes and dual-writes consistently', async () => {
    const rows = [
      baseRow({
        id: '1',
        slug: 'lost-project',
        project_status: 'lost',
        loss_reason: 'price',
        subproject_status: 'inactive',
        inactive_reason: 'price',
      }),
    ];
    const { client, updates } = createFakeSupabase(rows);

    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'admin-1',
      {
        projectSlugs: ['lost-project'],
        status: 'lost',
        lossReason: 'no_response',
      },
      {
        loadActorRole: async () => 'admin',
        appendAccountability: async () => undefined,
        nowIso: () => '2026-03-02T00:00:00.000Z',
      }
    );

    assert.equal(result.results[0]?.success, true);
    assert.equal(updates[0]?.patch.project_status, 'lost');
    assert.equal(updates[0]?.patch.loss_reason, 'no_response');
    assert.equal(updates[0]?.patch.inactive_reason, 'no_response');
  });

  it('allows member to update directly assigned project and subproject', async () => {
    const rows = [
      baseRow({ id: 'p', slug: 'parent', assigned_member_id: 'barbara' }),
      baseRow({
        id: 'c',
        slug: 'child',
        parent_project_id: 'p',
        assigned_member_id: 'barbara',
      }),
    ];
    const { client, updates } = createFakeSupabase(rows);

    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'barbara',
      { projectSlugs: ['parent', 'child'], status: 'cancelled' },
      {
        loadActorRole: async () => 'member',
        appendAccountability: async () => undefined,
      }
    );

    assert.equal(result.updatedCount, 2);
    assert.ok(result.results.every((item) => item.success));
    assert.equal(updates.length, 2);
  });

  it('Active → Lost clears stale completed_at/completed_by while dual-writing', async () => {
    const rows = [
      baseRow({
        id: '1',
        slug: 'stale-complete-lost',
        project_status: 'active',
        completed_at: '2026-01-01T00:00:00.000Z',
      }),
    ];
    const { client, updates } = createFakeSupabase(rows);

    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'admin-1',
      {
        projectSlugs: ['stale-complete-lost'],
        status: 'lost',
        lossReason: 'no_response',
      },
      {
        loadActorRole: async () => 'admin',
        appendAccountability: async () => undefined,
      }
    );

    assert.equal(result.results[0]?.success, true);
    assert.equal(updates[0]?.patch.project_status, 'lost');
    assert.equal(updates[0]?.patch.loss_reason, 'no_response');
    assert.equal(updates[0]?.patch.subproject_status, 'inactive');
    assert.equal(updates[0]?.patch.inactive_reason, 'no_response');
    assert.equal(updates[0]?.patch.completed_at, null);
    assert.equal(updates[0]?.patch.completed_by, null);
  });

  it('Active → Cancelled clears stale completed_at/completed_by while dual-writing', async () => {
    const rows = [
      baseRow({
        id: '1',
        slug: 'stale-complete-cancelled',
        project_status: 'active',
        completed_at: '2026-01-01T00:00:00.000Z',
      }),
    ];
    const { client, updates } = createFakeSupabase(rows);

    const result = await setCrmProjectsStatusForOrg(
      client,
      'org-1',
      'admin-1',
      { projectSlugs: ['stale-complete-cancelled'], status: 'cancelled' },
      {
        loadActorRole: async () => 'admin',
        appendAccountability: async () => undefined,
      }
    );

    assert.equal(result.results[0]?.success, true);
    assert.equal(updates[0]?.patch.project_status, 'cancelled');
    assert.equal(updates[0]?.patch.subproject_status, 'inactive');
    assert.equal(updates[0]?.patch.inactive_reason, 'project_canceled');
    assert.equal(updates[0]?.patch.completed_at, null);
    assert.equal(updates[0]?.patch.completed_by, null);
  });
});
