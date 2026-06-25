-- Subproject lifecycle status (urgent / normal / completed / inactive) with inactive reason tracking.
-- Safe to re-run: skips steps already applied.

alter table public.crm_projects
  add column if not exists subproject_status text not null default 'normal'
    check (subproject_status in ('urgent', 'normal', 'completed', 'inactive'));

alter table public.crm_projects
  add column if not exists inactive_reason text null
    check (
      inactive_reason is null
      or inactive_reason in (
        'chose_competitor',
        'price',
        'no_response',
        'project_canceled',
        'outside_service_area',
        'not_qualified',
        'duplicate',
        'other'
      )
    );

alter table public.crm_projects
  add column if not exists inactive_reason_custom text null;

alter table public.crm_projects
  add column if not exists inactive_at timestamptz null;

alter table public.crm_projects
  add column if not exists inactive_by uuid null references auth.users (id) on delete set null;

-- Backfill lifecycle from existing priority/completion fields (does not use archived_at).
update public.crm_projects
set subproject_status = case
  when completed_at is not null then 'completed'
  when priority = 'urgent' then 'urgent'
  else 'normal'
end
where subproject_status = 'normal'
  and (
    completed_at is not null
    or priority = 'urgent'
  );

create index if not exists idx_crm_projects_org_subproject_status
  on public.crm_projects (organization_id, subproject_status);

comment on column public.crm_projects.subproject_status is
  'Subproject lifecycle: urgent, normal, completed, or inactive. Independent of priority/stage/archived.';

comment on column public.crm_projects.inactive_reason is
  'Reason code when subproject_status is inactive.';

comment on column public.crm_projects.inactive_reason_custom is
  'Free-text reason when inactive_reason is other.';

comment on column public.crm_projects.inactive_at is
  'When the subproject was marked inactive.';

comment on column public.crm_projects.inactive_by is
  'User who marked the subproject inactive.';
