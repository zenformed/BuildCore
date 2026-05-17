# BuildCore Supabase migrations

CRM schema for the BuildCore consuming app. Migrations are **additive** and live in this app repo per [docs/ZENFORMED_CONSUMING_APP_ARCHITECTURE.md](../docs/ZENFORMED_CONSUMING_APP_ARCHITECTURE.md).

## Prerequisites

Shared Supabase project must already include platform tables (ForgeCore / ZenformedCore migrations):

- `public.platform_organizations`
- `public.platform_organization_members`
- `auth.users`

Typically applied from `ForgeCore/ForgeCore/supabase/migrations` through `00015_*` before BuildCore CRM migrations.

## Files

| Migration | Purpose |
|-----------|---------|
| `00001_crm_schema_foundation.sql` | Tables, indexes, `updated_at` triggers |
| `00002_crm_seed_pipeline_stages.sql` | 12 global default pipeline stages |
| `00003_crm_rls.sql` | Org-scoped RLS via `platform_organization_members` |

## Apply (manual)

**Option A — Supabase SQL editor**

1. Open the project SQL editor.
2. Run each file in order (`00001` → `00003`).

**Option B — Supabase CLI** (from `BuildCore/`)

```bash
# Link once: supabase link --project-ref <ref>
supabase db push
```

If your monorepo uses a single migrations directory under ForgeCore, copy or symlink these files with the next numeric prefix (e.g. `00016_crm_*`) so history stays linear.

## Phase 7A scope

- Schema + RLS only.
- No demo project seed (mock UI remains active).
- No Storage buckets yet (`storage_path` nullable on `crm_documents`).

## Rollback

Drop in reverse dependency order (dev only):

```sql
drop table if exists public.crm_accountability_events cascade;
drop table if exists public.crm_milestones cascade;
drop table if exists public.crm_documents cascade;
drop table if exists public.crm_workflow_tasks cascade;
drop table if exists public.crm_projects cascade;
drop table if exists public.crm_pipeline_stages cascade;
drop table if exists public.crm_contacts cascade;
drop table if exists public.crm_clients cascade;
drop function if exists public.crm_user_can_read_pipeline_stage(uuid);
drop function if exists public.crm_user_has_org_access(uuid);
drop function if exists public.crm_set_updated_at();
```
