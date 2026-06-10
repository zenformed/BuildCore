-- ============================================================================
-- BuildCore CRM — organization pipeline stage management
-- Seeds org-specific stages from global defaults; adds delete RLS.
-- ============================================================================

-- Seed org pipeline stages for every organization that does not have any yet.
insert into public.crm_pipeline_stages (organization_id, slug, label, sort_order, is_active)
select o.id, g.slug, g.label, g.sort_order, g.is_active
from public.platform_organizations o
cross join public.crm_pipeline_stages g
where g.organization_id is null
  and g.is_active = true
  and not exists (
    select 1
    from public.crm_pipeline_stages existing
    where existing.organization_id = o.id
  );

create policy crm_pipeline_stages_delete_org
  on public.crm_pipeline_stages for delete to authenticated
  using (
    organization_id is not null
    and public.crm_user_has_org_access(organization_id)
  );

comment on table public.crm_pipeline_stages is
  'Pipeline stage catalog. organization_id NULL = global default row (seed). Per-org rows drive BuildCore workflow stages.';
