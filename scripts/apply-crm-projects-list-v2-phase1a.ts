/**
 * Apply Phase 1A RPC migration and run EXPLAIN (ANALYZE, BUFFERS) against a live DB.
 *
 * Requires DATABASE_URL (Postgres connection string with DDL rights).
 * Example:
 *   DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres \
 *     npx tsx --tsconfig tsconfig.json scripts/apply-crm-projects-list-v2-phase1a.ts
 *
 * Without DATABASE_URL, exits with instructions (does not fake EXPLAIN results).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const ORG_ID = '1defbbdb-631c-487f-bcc2-b9cc27af9cf7';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      [
        'DATABASE_URL is required to apply migration 00065 and run EXPLAIN ANALYZE.',
        'Set it to the Supabase Postgres connection string, then re-run this script.',
        'Migration file: supabase/migrations/00065_crm_projects_list_v2_roots_rpc.sql',
        'EXPLAIN templates: scripts/explain-crm-projects-list-v2.sql',
      ].join('\n')
    );
    process.exit(2);
  }

  const migrationPath = resolve(
    process.cwd(),
    'supabase/migrations/00065_crm_projects_list_v2_roots_rpc.sql'
  );
  const sql = readFileSync(migrationPath, 'utf8');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    console.log('Applying 00065_crm_projects_list_v2_roots_rpc.sql ...');
    await client.query(sql);

    const probes: { label: string; text: string; values?: unknown[] }[] = [
      {
        label: 'first page',
        text: `
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, list_sort_bucket, last_activity_at
FROM public.crm_projects
WHERE organization_id = $1::uuid
  AND archived_at IS NULL
  AND parent_project_id IS NULL
ORDER BY list_sort_bucket ASC, last_activity_at DESC NULLS LAST, id DESC
LIMIT 51`,
        values: [ORG_ID],
      },
      {
        label: 'filtered urgent',
        text: `
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.id, p.list_sort_bucket, p.last_activity_at
FROM public.crm_projects p
WHERE p.organization_id = $1::uuid
  AND p.archived_at IS NULL
  AND p.parent_project_id IS NULL
  AND public.crm_root_matches_list_v2(
    p.organization_id, p.id, null, null, null, null, array['urgent']::text[], null
  )
ORDER BY p.list_sort_bucket ASC, p.last_activity_at DESC NULLS LAST, p.id DESC
LIMIT 51`,
        values: [ORG_ID],
      },
      {
        label: 'search prefix ac',
        text: `
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.id, p.list_sort_bucket, p.last_activity_at
FROM public.crm_projects p
WHERE p.organization_id = $1::uuid
  AND p.archived_at IS NULL
  AND p.parent_project_id IS NULL
  AND public.crm_root_matches_list_v2(
    p.organization_id, p.id, 'ac', null, null, null, null, null
  )
ORDER BY p.list_sort_bucket ASC, p.last_activity_at DESC NULLS LAST, p.id DESC
LIMIT 51`,
        values: [ORG_ID],
      },
      {
        label: 'rpc first page',
        text: `
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.crm_list_root_projects_page_v2(
  $1::uuid, '00000000-0000-4000-8000-000000000000'::uuid,
  false, false, false, false, array[]::uuid[],
  null, null, null, null, null, null,
  51, 'forward', null, null, null
)`,
        values: [ORG_ID],
      },
    ];

    const firstPage = await client.query(
      `
SELECT id, list_sort_bucket, last_activity_at
FROM public.crm_projects
WHERE organization_id = $1::uuid
  AND archived_at IS NULL
  AND parent_project_id IS NULL
ORDER BY list_sort_bucket ASC, last_activity_at DESC NULLS LAST, id DESC
LIMIT 1`,
      [ORG_ID]
    );
    const last = firstPage.rows[0] as
      | { id: string; list_sort_bucket: number; last_activity_at: string | null }
      | undefined;
    if (last != null) {
      probes.splice(1, 0, {
        label: 'next page',
        text: `
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, list_sort_bucket, last_activity_at
FROM public.crm_projects
WHERE organization_id = $1::uuid
  AND archived_at IS NULL
  AND parent_project_id IS NULL
  AND public.crm_list_v2_after_cursor(
    list_sort_bucket, last_activity_at, id,
    $2::smallint, $3::timestamptz, $4::uuid
  )
ORDER BY list_sort_bucket ASC, last_activity_at DESC NULLS LAST, id DESC
LIMIT 51`,
        values: [ORG_ID, last.list_sort_bucket, last.last_activity_at, last.id],
      });
    }

    for (const probe of probes) {
      console.log(`\n=== EXPLAIN: ${probe.label} ===`);
      const result = await client.query(probe.text, probe.values);
      for (const row of result.rows) {
        const plan = (row as Record<string, string>)['QUERY PLAN'];
        if (plan) console.log(plan);
        else console.log(JSON.stringify(row));
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
