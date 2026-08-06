-- Project/Subproject status model (Phase 1): additive columns + backfill.
-- Dual-read safe: legacy subproject_status / inactive_* remain authoritative writers until Phase 2+
-- dual-writes are fully rolled out. App prefers project_status when present.
-- Safe to re-run: skips steps already applied.

-- ---------------------------------------------------------------------------
-- 1) Columns
-- ---------------------------------------------------------------------------

alter table public.crm_projects
  add column if not exists project_status text;

alter table public.crm_projects
  add column if not exists loss_reason text;

alter table public.crm_projects
  add column if not exists loss_reason_other text;

alter table public.crm_projects
  add column if not exists status_changed_at timestamptz;

alter table public.crm_projects
  add column if not exists status_changed_by uuid references auth.users (id) on delete set null;

comment on column public.crm_projects.project_status is
  'Project/Subproject status: active, completed, lost, or cancelled. Domain field name: status. Named project_status to avoid ambiguity with crm_workflow_tasks.status / milestone status in SQL joins.';

comment on column public.crm_projects.loss_reason is
  'Machine-readable loss reason when project_status = lost. Null for active/completed/cancelled.';

comment on column public.crm_projects.loss_reason_other is
  'Free-text reason when loss_reason = other (also used to preserve legacy null/invalid inactive reasons during backfill).';

comment on column public.crm_projects.status_changed_at is
  'When project_status last changed.';

comment on column public.crm_projects.status_changed_by is
  'User who last changed project_status.';

-- ---------------------------------------------------------------------------
-- 2) Backfill (deterministic precedence)
--    1. inactive + project_canceled → cancelled
--    2. inactive + any other reason → lost
--    3. completed status OR completed_at not null → completed
--    4. urgent / normal / else → active
-- ---------------------------------------------------------------------------

update public.crm_projects
set
  project_status = case
    when subproject_status = 'inactive' and inactive_reason = 'project_canceled' then 'cancelled'
    when subproject_status = 'inactive' then 'lost'
    when subproject_status = 'completed' or completed_at is not null then 'completed'
    else 'active'
  end,
  loss_reason = case
    when subproject_status = 'inactive' and inactive_reason = 'project_canceled' then null
    when subproject_status = 'inactive'
      and inactive_reason in (
        'chose_competitor',
        'price',
        'no_response',
        'outside_service_area',
        'not_qualified',
        'duplicate',
        'dead_lead',
        'other'
      )
      then inactive_reason
    when subproject_status = 'inactive' then 'other'
    else null
  end,
  loss_reason_other = case
    when subproject_status = 'inactive' and inactive_reason = 'project_canceled' then null
    when subproject_status = 'inactive' and inactive_reason = 'other'
      then inactive_reason_custom
    when subproject_status = 'inactive' and inactive_reason is null
      then coalesce(
        nullif(trim(inactive_reason_custom), ''),
        '[legacy] missing inactive_reason'
      )
    when subproject_status = 'inactive'
      and inactive_reason not in (
        'chose_competitor',
        'price',
        'no_response',
        'project_canceled',
        'outside_service_area',
        'not_qualified',
        'duplicate',
        'dead_lead',
        'other'
      )
      then coalesce(
        nullif(trim(inactive_reason_custom), ''),
        '[legacy] invalid inactive_reason: ' || inactive_reason
      )
    else null
  end,
  status_changed_at = case
    when subproject_status = 'inactive' then inactive_at
    when subproject_status = 'completed' or completed_at is not null then completed_at
    else null
  end,
  status_changed_by = case
    when subproject_status = 'inactive' then inactive_by
    when subproject_status = 'completed' or completed_at is not null then completed_by
    else null
  end
where project_status is null;

-- Any remaining nulls (unexpected legacy values) → active
update public.crm_projects
set project_status = 'active'
where project_status is null;

-- ---------------------------------------------------------------------------
-- 3) Constraints (Phase 1 — dual-write compatible)
--    Deferred until legacy removal (Phase 5):
--      - loss_reason required when project_status = lost
--      - loss_reason_other required when loss_reason = other
--      - loss_reason must be null unless project_status = lost
-- ---------------------------------------------------------------------------

alter table public.crm_projects
  alter column project_status set default 'active';

alter table public.crm_projects
  alter column project_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_projects_project_status_check'
      and conrelid = 'public.crm_projects'::regclass
  ) then
    alter table public.crm_projects
      add constraint crm_projects_project_status_check
      check (project_status in ('active', 'completed', 'lost', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_projects_loss_reason_check'
      and conrelid = 'public.crm_projects'::regclass
  ) then
    alter table public.crm_projects
      add constraint crm_projects_loss_reason_check
      check (
        loss_reason is null
        or loss_reason in (
          'chose_competitor',
          'price',
          'no_response',
          'outside_service_area',
          'not_qualified',
          'duplicate',
          'dead_lead',
          'other'
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Index for operational lists
-- ---------------------------------------------------------------------------

create index if not exists idx_crm_projects_org_project_status
  on public.crm_projects (organization_id, project_status);

-- ---------------------------------------------------------------------------
-- 5) Post-backfill inspection queries (run manually after apply)
-- ---------------------------------------------------------------------------
-- See scripts/inspect-crm-project-status-backfill.sql
