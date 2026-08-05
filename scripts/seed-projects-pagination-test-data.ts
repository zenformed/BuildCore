/**
 * Seed 120 root Projects for Projects list v2 pagination testing.
 *
 * Usage:
 *   ALLOW_BUILDCORE_PAGINATION_TEST_DATA=true npm run testdata:projects-pagination:seed
 *
 * Idempotent: skips indexes that already exist (org + notes marker + exact name).
 * Does not create tasks/payments/budgets/photos/documents or accountability events.
 */

import { generateCrmProjectLeadToken } from '../src/infrastructure/lead/generateLeadToken';
import {
  ALLOW_ENV_KEY,
  assertPaginationTestDataSafety,
  formatPaginationTestCompanyName,
  formatPaginationTestContactName,
  formatPaginationTestEmail,
  formatPaginationTestPhone,
  formatPaginationTestProjectName,
  formatPaginationTestProjectSlug,
  lastActivityAtForIndex,
  lifecycleForIndex,
  PAGINATION_TEST_MARKER,
  PAGINATION_TEST_ORG_ID,
  PAGINATION_TEST_PROJECT_COUNT,
  requireCrmServiceRoleClient,
  type PaginationTestLifecycle,
} from './projects-pagination-test-data-shared';

type ExistingRow = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly subproject_status: string | null;
};

function lifecycleWriteFields(lifecycle: PaginationTestLifecycle, nowIso: string): Record<string, unknown> {
  switch (lifecycle) {
    case 'urgent':
      return {
        priority: 'urgent',
        subproject_status: 'urgent',
        completed_at: null,
        inactive_reason: null,
        inactive_at: null,
      };
    case 'normal':
      return {
        priority: 'normal',
        subproject_status: 'normal',
        completed_at: null,
        inactive_reason: null,
        inactive_at: null,
      };
    case 'completed':
      return {
        priority: 'normal',
        subproject_status: 'completed',
        completed_at: nowIso,
        inactive_reason: null,
        inactive_at: null,
      };
    case 'inactive':
      return {
        priority: 'normal',
        subproject_status: 'inactive',
        completed_at: null,
        inactive_reason: 'other',
        inactive_reason_custom: 'pagination test fixture',
        inactive_at: nowIso,
      };
  }
}

async function loadExisting(supabase: ReturnType<typeof requireCrmServiceRoleClient>): Promise<ExistingRow[]> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('id, name, slug, subproject_status')
    .eq('organization_id', PAGINATION_TEST_ORG_ID)
    .eq('notes', PAGINATION_TEST_MARKER)
    .is('parent_project_id', null);
  if (error) {
    throw new Error(`Failed to load existing test projects: ${error.message}`);
  }
  return (data ?? []) as ExistingRow[];
}

async function countByLifecycle(
  supabase: ReturnType<typeof requireCrmServiceRoleClient>
): Promise<Record<PaginationTestLifecycle, number>> {
  const existing = await loadExisting(supabase);
  const counts: Record<PaginationTestLifecycle, number> = {
    urgent: 0,
    normal: 0,
    completed: 0,
    inactive: 0,
  };
  for (const row of existing) {
    const status = (row.subproject_status ?? 'normal') as PaginationTestLifecycle;
    if (status in counts) {
      counts[status] += 1;
    }
  }
  return counts;
}

async function main(): Promise<void> {
  assertPaginationTestDataSafety('seed');
  const supabase = requireCrmServiceRoleClient();

  const existing = await loadExisting(supabase);
  const existingNames = new Set(existing.map((row) => row.name));

  const missingIndexes: number[] = [];
  for (let index = 1; index <= PAGINATION_TEST_PROJECT_COUNT; index += 1) {
    const name = formatPaginationTestProjectName(index);
    if (!existingNames.has(name)) {
      missingIndexes.push(index);
    }
  }

  console.log(
    JSON.stringify(
      {
        action: 'seed',
        organizationId: PAGINATION_TEST_ORG_ID,
        marker: PAGINATION_TEST_MARKER,
        targetCount: PAGINATION_TEST_PROJECT_COUNT,
        alreadyPresent: existing.length,
        wouldCreate: missingIndexes.length,
        allowEnv: ALLOW_ENV_KEY,
      },
      null,
      2
    )
  );

  if (missingIndexes.length === 0) {
    const counts = await countByLifecycle(supabase);
    console.log(
      JSON.stringify(
        {
          summary: true,
          totalMatchingTestProjects: existing.length,
          countsByLifecycle: counts,
          firstName: formatPaginationTestProjectName(1),
          lastName: formatPaginationTestProjectName(PAGINATION_TEST_PROJECT_COUNT),
          reminder:
            'Test dashboard page sizes 25, 50, and 100 (Previous/Next, range counts, search, filters).',
          note: 'Idempotent: nothing to insert.',
        },
        null,
        2
      )
    );
    return;
  }

  let created = 0;
  for (const index of missingIndexes) {
    const name = formatPaginationTestProjectName(index);
    const slug = formatPaginationTestProjectSlug(index);
    const lifecycle = lifecycleForIndex(index);
    const lastActivityAt = lastActivityAtForIndex(index);
    const nowIso = new Date().toISOString();

    const { data: clientRow, error: clientError } = await supabase
      .from('crm_clients')
      .insert({
        organization_id: PAGINATION_TEST_ORG_ID,
        company_name: formatPaginationTestCompanyName(index),
        notes: PAGINATION_TEST_MARKER,
      })
      .select('id')
      .single();
    if (clientError || clientRow == null) {
      throw new Error(`Failed to create client for ${name}: ${clientError?.message ?? 'unknown'}`);
    }

    const email = formatPaginationTestEmail(index);
    const phone = formatPaginationTestPhone(index);
    const { data: contactRow, error: contactError } = await supabase
      .from('crm_contacts')
      .insert({
        organization_id: PAGINATION_TEST_ORG_ID,
        client_id: clientRow.id,
        full_name: formatPaginationTestContactName(index),
        email,
        phone,
        contact_emails: [email],
        contact_phones: [phone],
      })
      .select('id')
      .single();
    if (contactError || contactRow == null) {
      throw new Error(`Failed to create contact for ${name}: ${contactError?.message ?? 'unknown'}`);
    }

    const { error: projectError } = await supabase.from('crm_projects').insert({
      organization_id: PAGINATION_TEST_ORG_ID,
      slug,
      name,
      parent_project_id: null,
      client_id: clientRow.id,
      primary_contact_id: contactRow.id,
      industry: 'general-contractor',
      custom_industry: null,
      priority: lifecycle === 'urgent' ? 'urgent' : 'normal',
      current_stage_slug: 'new-lead',
      notes: PAGINATION_TEST_MARKER,
      deal_value_cents: 0,
      balance_cents: 0,
      assigned_member_id: null,
      last_activity_at: lastActivityAt,
      lead_token: generateCrmProjectLeadToken(),
      address_line_1: `${1000 + index} Pagination Test Ave`,
      address_line_2: null,
      city: 'Testville',
      state: 'TX',
      postal_code: '75001',
      archived_at: null,
      ...lifecycleWriteFields(lifecycle, nowIso),
    });
    if (projectError) {
      throw new Error(`Failed to create project ${name}: ${projectError.message}`);
    }
    created += 1;
    if (created % 20 === 0 || created === missingIndexes.length) {
      console.log(`Created ${created}/${missingIndexes.length}…`);
    }
  }

  const after = await loadExisting(supabase);
  const counts = await countByLifecycle(supabase);
  const names = after.map((row) => row.name).sort();
  console.log(
    JSON.stringify(
      {
        summary: true,
        created,
        totalMatchingTestProjects: after.length,
        countsByLifecycle: counts,
        firstName: names[0] ?? null,
        lastName: names[names.length - 1] ?? null,
        reminder:
          'Test dashboard page sizes 25, 50, and 100 (Previous/Next, range counts, search, filters).',
      },
      null,
      2
    )
  );

  if (after.length !== PAGINATION_TEST_PROJECT_COUNT) {
    console.warn(
      `Warning: expected ${PAGINATION_TEST_PROJECT_COUNT} marked roots, found ${after.length}.`
    );
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
