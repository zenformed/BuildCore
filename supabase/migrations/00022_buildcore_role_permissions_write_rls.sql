-- Allow authenticated org members to upsert BuildCore role permissions via BuildCore API routes.
-- Manager-role enforcement is handled in application code (owner/admin/coordinator).

create policy buildcore_role_permissions_insert_org
  on public.buildcore_role_permissions for insert to authenticated
  with check (public.crm_user_has_org_access(organization_id));

create policy buildcore_role_permissions_update_org
  on public.buildcore_role_permissions for update to authenticated
  using (public.crm_user_has_org_access(organization_id))
  with check (public.crm_user_has_org_access(organization_id));
