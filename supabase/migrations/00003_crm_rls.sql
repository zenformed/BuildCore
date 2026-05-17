-- ============================================================================
-- BuildCore CRM — RLS (organization-scoped via platform_organization_members)
--
-- Pattern: same org membership model as 00014_platform_rls_select_parity.sql
-- BFF/service role bypasses RLS for early API work; JWT policies ready for later.
-- ============================================================================

create or replace function public.crm_user_has_org_access(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.membership_status = 'active'
  );
$$;

comment on function public.crm_user_has_org_access(uuid) is
  'True when the current auth user has active membership in the given organization.';

create or replace function public.crm_user_can_read_pipeline_stage(stage_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    stage_org_id is null
    or public.crm_user_has_org_access(stage_org_id);
$$;

-- Enable RLS on all CRM tables
alter table public.crm_clients enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_projects enable row level security;
alter table public.crm_workflow_tasks enable row level security;
alter table public.crm_documents enable row level security;
alter table public.crm_milestones enable row level security;
alter table public.crm_accountability_events enable row level security;

-- -----------------------------------------------------------------------------
-- Clients
-- -----------------------------------------------------------------------------
create policy crm_clients_select_org
  on public.crm_clients for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_clients_insert_org
  on public.crm_clients for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_clients_update_org
  on public.crm_clients for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_clients_delete_org
  on public.crm_clients for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Contacts
-- -----------------------------------------------------------------------------
create policy crm_contacts_select_org
  on public.crm_contacts for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_contacts_insert_org
  on public.crm_contacts for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_contacts_update_org
  on public.crm_contacts for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_contacts_delete_org
  on public.crm_contacts for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Pipeline stages (global defaults + org overrides)
-- -----------------------------------------------------------------------------
create policy crm_pipeline_stages_select
  on public.crm_pipeline_stages for select to authenticated
  using (public.crm_user_can_read_pipeline_stage(organization_id));

-- Org-scoped stage overrides: members of that org may manage
create policy crm_pipeline_stages_insert_org
  on public.crm_pipeline_stages for insert to authenticated
  with check (
    organization_id is not null
    and public.crm_user_has_org_access(organization_id)
  );

create policy crm_pipeline_stages_update_org
  on public.crm_pipeline_stages for update to authenticated
  using (
    organization_id is not null
    and public.crm_user_has_org_access(organization_id)
  )
  with check (
    organization_id is not null
    and public.crm_user_has_org_access(organization_id)
  );

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------
create policy crm_projects_select_org
  on public.crm_projects for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_projects_insert_org
  on public.crm_projects for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_projects_update_org
  on public.crm_projects for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_projects_delete_org
  on public.crm_projects for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Workflow tasks
-- -----------------------------------------------------------------------------
create policy crm_workflow_tasks_select_org
  on public.crm_workflow_tasks for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_workflow_tasks_insert_org
  on public.crm_workflow_tasks for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_workflow_tasks_update_org
  on public.crm_workflow_tasks for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_workflow_tasks_delete_org
  on public.crm_workflow_tasks for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Documents
-- -----------------------------------------------------------------------------
create policy crm_documents_select_org
  on public.crm_documents for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_documents_insert_org
  on public.crm_documents for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_documents_update_org
  on public.crm_documents for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_documents_delete_org
  on public.crm_documents for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Milestones
-- -----------------------------------------------------------------------------
create policy crm_milestones_select_org
  on public.crm_milestones for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_milestones_insert_org
  on public.crm_milestones for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_milestones_update_org
  on public.crm_milestones for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));

create policy crm_milestones_delete_org
  on public.crm_milestones for delete to authenticated
  using (public.crm_user_has_org_access(organization_id));

-- -----------------------------------------------------------------------------
-- Accountability (append-only for authenticated clients; no delete policy)
-- -----------------------------------------------------------------------------
create policy crm_accountability_select_org
  on public.crm_accountability_events for select to authenticated
  using (public.crm_user_has_org_access(organization_id));

create policy crm_accountability_insert_org
  on public.crm_accountability_events for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));
