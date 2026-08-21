-- BuildCore per-member Project visibility capability.
-- Default is implicit `all`; a row is only required for an opt-in restriction.
create table if not exists public.buildcore_project_member_access (
  organization_id uuid not null references public.platform_organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_access_scope text not null check (project_access_scope in ('all', 'assigned_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

comment on table public.buildcore_project_member_access is
  'Optional BuildCore per-member project access capability. No row means all project access.';

drop trigger if exists buildcore_project_member_access_set_updated_at on public.buildcore_project_member_access;
create trigger buildcore_project_member_access_set_updated_at
  before update on public.buildcore_project_member_access
  for each row execute function public.crm_set_updated_at();

alter table public.buildcore_project_member_access enable row level security;

-- Members may read only their own capability. Administrative writes are intentionally
-- performed through BuildCore's authenticated server route, not directly by clients.
create policy buildcore_project_member_access_select_self
  on public.buildcore_project_member_access for select to authenticated
  using (user_id = auth.uid() and public.crm_user_has_org_access(organization_id));
create policy buildcore_project_member_access_manage_admin
  on public.buildcore_project_member_access for all to authenticated
  using (exists (
    select 1 from public.platform_organization_members m
    where m.organization_id = buildcore_project_member_access.organization_id
      and m.user_id = auth.uid()
      and m.membership_status = 'active'
      and m.role in ('owner', 'admin')
  ))
  with check (exists (
    select 1 from public.platform_organization_members m
    where m.organization_id = buildcore_project_member_access.organization_id
      and m.user_id = auth.uid()
      and m.membership_status = 'active'
      and m.role in ('owner', 'admin')
  ));

create or replace function public.buildcore_current_user_project_access_scope(p_organization_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case when exists (
    select 1 from public.platform_organization_members m
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
      and m.membership_status = 'active' and m.role in ('owner', 'admin')
  ) then 'all' else coalesce((
    select a.project_access_scope
    from public.buildcore_project_member_access a
    where a.organization_id = p_organization_id and a.user_id = auth.uid()
  ), 'all') end;
$$;

create or replace function public.buildcore_current_user_can_access_project(
  p_organization_id uuid,
  p_project_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.crm_user_has_org_access(p_organization_id)
    and (
      public.buildcore_current_user_project_access_scope(p_organization_id) = 'all'
      or exists (
        select 1 from public.crm_projects p
        where p.id = p_project_id
          and p.organization_id = p_organization_id
          and p.assigned_member_id = auth.uid()
      )
    );
$$;

create or replace function public.buildcore_current_user_can_create_project(
  p_organization_id uuid,
  p_assigned_member_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.crm_user_has_org_access(p_organization_id)
    and (
      public.buildcore_current_user_project_access_scope(p_organization_id) = 'all'
      or p_assigned_member_id = auth.uid()
    );
$$;

-- Replace broad organization-only CRM row policies with the centralized project
-- boundary. Existing users have implicit all access, so this is opt-in only.
drop policy if exists crm_projects_select_org on public.crm_projects;
drop policy if exists crm_projects_insert_org on public.crm_projects;
drop policy if exists crm_projects_update_org on public.crm_projects;
drop policy if exists crm_projects_delete_org on public.crm_projects;
create policy crm_projects_select_project_access on public.crm_projects for select to authenticated
  using (public.buildcore_current_user_can_access_project(organization_id, id));
create policy crm_projects_insert_project_access on public.crm_projects for insert to authenticated
  with check (public.buildcore_current_user_can_create_project(organization_id, assigned_member_id));
create policy crm_projects_update_project_access on public.crm_projects for update to authenticated
  using (public.buildcore_current_user_can_access_project(organization_id, id))
  with check (public.buildcore_current_user_can_create_project(organization_id, assigned_member_id));
create policy crm_projects_delete_project_access on public.crm_projects for delete to authenticated
  using (public.buildcore_current_user_can_access_project(organization_id, id));

-- Related records inherit project access. This is the database backstop for all
-- route/service paths, including manually issued Supabase calls.
drop policy if exists crm_workflow_tasks_select_org on public.crm_workflow_tasks;
drop policy if exists crm_workflow_tasks_insert_org on public.crm_workflow_tasks;
drop policy if exists crm_workflow_tasks_update_org on public.crm_workflow_tasks;
drop policy if exists crm_workflow_tasks_delete_org on public.crm_workflow_tasks;
drop policy if exists crm_documents_select_org on public.crm_documents;
drop policy if exists crm_documents_insert_org on public.crm_documents;
drop policy if exists crm_documents_update_org on public.crm_documents;
drop policy if exists crm_documents_delete_org on public.crm_documents;
drop policy if exists crm_milestones_select_org on public.crm_milestones;
drop policy if exists crm_milestones_insert_org on public.crm_milestones;
drop policy if exists crm_milestones_update_org on public.crm_milestones;
drop policy if exists crm_milestones_delete_org on public.crm_milestones;
drop policy if exists crm_accountability_select_org on public.crm_accountability_events;
drop policy if exists crm_accountability_insert_org on public.crm_accountability_events;
drop policy if exists crm_project_budget_entries_select_org on public.crm_project_budget_entries;
drop policy if exists crm_project_budget_entries_insert_org on public.crm_project_budget_entries;
drop policy if exists crm_project_budget_entries_update_org on public.crm_project_budget_entries;
drop policy if exists crm_project_budget_entries_delete_org on public.crm_project_budget_entries;
drop policy if exists crm_project_stage_completions_select_org on public.crm_project_stage_completions;
drop policy if exists crm_project_stage_completions_insert_org on public.crm_project_stage_completions;
drop policy if exists crm_project_stage_completions_update_org on public.crm_project_stage_completions;
drop policy if exists crm_project_stage_completions_delete_org on public.crm_project_stage_completions;
drop policy if exists buildcore_project_custom_field_values_select_org on public.buildcore_project_custom_field_values;
drop policy if exists buildcore_project_custom_field_values_insert_org on public.buildcore_project_custom_field_values;
drop policy if exists buildcore_project_custom_field_values_update_org on public.buildcore_project_custom_field_values;
drop policy if exists buildcore_project_custom_field_values_delete_org on public.buildcore_project_custom_field_values;
drop policy if exists crm_record_identity_values_select_org on public.crm_record_identity_values;
drop policy if exists crm_record_identity_values_insert_org on public.crm_record_identity_values;
drop policy if exists crm_record_identity_values_update_org on public.crm_record_identity_values;
drop policy if exists crm_record_identity_values_delete_org on public.crm_record_identity_values;
drop policy if exists buildcore_wt_custom_field_values_select_org on public.buildcore_workflow_task_custom_field_values;
drop policy if exists buildcore_wt_custom_field_values_insert_org on public.buildcore_workflow_task_custom_field_values;
drop policy if exists buildcore_wt_custom_field_values_update_org on public.buildcore_workflow_task_custom_field_values;
drop policy if exists buildcore_wt_custom_field_values_delete_org on public.buildcore_workflow_task_custom_field_values;
create or replace function public.buildcore_replace_project_record_policy(p_table regclass, p_name text, p_command text)
returns void language plpgsql security definer set search_path = public as $$
begin
  execute format('drop policy if exists %I on %s', p_name, p_table);
  if p_command = 'select' then
    execute format(
      'create policy %I on %s for select to authenticated using (public.buildcore_current_user_can_access_project(organization_id, project_id))',
      p_name, p_table
    );
  elsif p_command = 'insert' then
    execute format(
      'create policy %I on %s for insert to authenticated with check (public.buildcore_current_user_can_access_project(organization_id, project_id))',
      p_name, p_table
    );
  else
    execute format(
      'create policy %I on %s for %s to authenticated using (public.buildcore_current_user_can_access_project(organization_id, project_id)) with check (public.buildcore_current_user_can_access_project(organization_id, project_id))',
      p_name, p_table, p_command
    );
  end if;
end;
$$;

select public.buildcore_replace_project_record_policy('public.crm_workflow_tasks', 'crm_workflow_tasks_project_access', 'all');
select public.buildcore_replace_project_record_policy('public.crm_documents', 'crm_documents_project_access', 'all');
select public.buildcore_replace_project_record_policy('public.crm_milestones', 'crm_milestones_project_access', 'all');
-- Accountability remains append-only: only select/insert are permitted.
select public.buildcore_replace_project_record_policy('public.crm_accountability_events', 'crm_accountability_events_project_access_select', 'select');
select public.buildcore_replace_project_record_policy('public.crm_accountability_events', 'crm_accountability_events_project_access_insert', 'insert');
select public.buildcore_replace_project_record_policy('public.crm_project_budget_entries', 'crm_project_budget_entries_project_access', 'all');
select public.buildcore_replace_project_record_policy('public.crm_project_stage_completions', 'crm_project_stage_completions_project_access', 'all');
select public.buildcore_replace_project_record_policy('public.buildcore_project_custom_field_values', 'buildcore_project_custom_field_values_project_access', 'all');
drop function public.buildcore_replace_project_record_policy(regclass, text, text);

create policy crm_record_identity_values_project_access on public.crm_record_identity_values for all to authenticated
  using (public.buildcore_current_user_can_access_project(organization_id, record_id))
  with check (public.buildcore_current_user_can_access_project(organization_id, record_id));
create policy buildcore_wt_custom_field_values_project_access on public.buildcore_workflow_task_custom_field_values for all to authenticated
  using (exists (
    select 1 from public.crm_workflow_tasks t
    where t.id = buildcore_workflow_task_custom_field_values.workflow_task_id
      and t.organization_id = buildcore_workflow_task_custom_field_values.organization_id
      and public.buildcore_current_user_can_access_project(t.organization_id, t.project_id)
  ))
  with check (exists (
    select 1 from public.crm_workflow_tasks t
    where t.id = buildcore_workflow_task_custom_field_values.workflow_task_id
      and t.organization_id = buildcore_workflow_task_custom_field_values.organization_id
      and public.buildcore_current_user_can_access_project(t.organization_id, t.project_id)
  ));

-- Client/contact records are only readable or mutable when linked to an accessible
-- project. Inserts remain org-scoped because Project creation creates them first.
drop policy if exists crm_clients_select_org on public.crm_clients;
drop policy if exists crm_clients_update_org on public.crm_clients;
drop policy if exists crm_clients_delete_org on public.crm_clients;
drop policy if exists crm_contacts_select_org on public.crm_contacts;
drop policy if exists crm_contacts_update_org on public.crm_contacts;
drop policy if exists crm_contacts_delete_org on public.crm_contacts;
create policy crm_clients_project_access on public.crm_clients for select to authenticated using (
  exists (select 1 from public.crm_projects p where p.organization_id = crm_clients.organization_id and p.client_id = crm_clients.id and public.buildcore_current_user_can_access_project(p.organization_id, p.id))
);
create policy crm_contacts_project_access on public.crm_contacts for select to authenticated using (
  exists (select 1 from public.crm_projects p where p.organization_id = crm_contacts.organization_id and p.primary_contact_id = crm_contacts.id and public.buildcore_current_user_can_access_project(p.organization_id, p.id))
);
create policy crm_clients_project_access_update on public.crm_clients for update to authenticated using (
  exists (select 1 from public.crm_projects p where p.organization_id = crm_clients.organization_id and p.client_id = crm_clients.id and public.buildcore_current_user_can_access_project(p.organization_id, p.id))
) with check (public.crm_user_has_org_access(organization_id));
create policy crm_contacts_project_access_update on public.crm_contacts for update to authenticated using (
  exists (select 1 from public.crm_projects p where p.organization_id = crm_contacts.organization_id and p.primary_contact_id = crm_contacts.id and public.buildcore_current_user_can_access_project(p.organization_id, p.id))
) with check (public.crm_user_has_org_access(organization_id));

-- Imports can contain organization-wide source data and cannot safely be made
-- assigned-project scoped. Restricted users cannot read or create them.
drop policy if exists crm_import_jobs_select_org on public.crm_import_jobs;
drop policy if exists crm_import_jobs_insert_org on public.crm_import_jobs;
drop policy if exists crm_import_jobs_update_org on public.crm_import_jobs;
drop policy if exists crm_import_parent_groups_select_org on public.crm_import_parent_groups;
drop policy if exists crm_import_parent_groups_insert_org on public.crm_import_parent_groups;
drop policy if exists crm_import_parent_groups_update_org on public.crm_import_parent_groups;
drop policy if exists crm_import_job_rows_select_org on public.crm_import_job_rows;
drop policy if exists crm_import_job_rows_insert_org on public.crm_import_job_rows;
drop policy if exists crm_import_job_rows_update_org on public.crm_import_job_rows;
create policy crm_import_jobs_unrestricted on public.crm_import_jobs for all to authenticated
  using (
    public.crm_user_has_org_access(organization_id)
    and public.buildcore_current_user_project_access_scope(organization_id) = 'all'
  )
  with check (
    public.crm_user_has_org_access(organization_id)
    and public.buildcore_current_user_project_access_scope(organization_id) = 'all'
  );
create policy crm_import_parent_groups_unrestricted on public.crm_import_parent_groups for all to authenticated
  using (
    public.crm_user_has_org_access(organization_id)
    and public.buildcore_current_user_project_access_scope(organization_id) = 'all'
  )
  with check (
    public.crm_user_has_org_access(organization_id)
    and public.buildcore_current_user_project_access_scope(organization_id) = 'all'
  );
create policy crm_import_job_rows_unrestricted on public.crm_import_job_rows for all to authenticated
  using (
    public.crm_user_has_org_access(organization_id)
    and public.buildcore_current_user_project_access_scope(organization_id) = 'all'
  )
  with check (
    public.crm_user_has_org_access(organization_id)
    and public.buildcore_current_user_project_access_scope(organization_id) = 'all'
  );

-- List V2 pages/counts were introduced as SECURITY DEFINER RPCs for their
-- derived-stage helpers. They must run their outer project queries as the
-- caller so the project policies above constrain rows before filters, counts,
-- keyset pagination, cursors, and child rollups are evaluated.
alter function public.crm_list_root_projects_page_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) security invoker;
alter function public.crm_count_root_projects_v2(
  uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[]
) security invoker;
alter function public.crm_list_child_projects_page_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[],
  int, text, smallint, timestamptz, uuid
) security invoker;
alter function public.crm_count_child_projects_v2(
  uuid, uuid, uuid, boolean, boolean, boolean, boolean, uuid[],
  text, text, text, text[], text[], text[], text[]
) security invoker;
