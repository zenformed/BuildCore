-- List active org member user ids for BuildCore workflow task member visibility.
-- Uses SECURITY DEFINER so member-role viewers can resolve peer assignees without
-- platform_organization_members RLS returning only their own membership row.

create or replace function public.buildcore_active_member_role_user_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id
  from public.platform_organization_members m
  where m.organization_id = p_organization_id
    and m.membership_status = 'active'
    and m.role = 'member'
    and public.crm_user_has_org_access(p_organization_id);
$$;

comment on function public.buildcore_active_member_role_user_ids(uuid) is
  'BuildCore: active organization member user ids for workflow task visibility (member role only).';

revoke all on function public.buildcore_active_member_role_user_ids(uuid) from public;
grant execute on function public.buildcore_active_member_role_user_ids(uuid) to authenticated;
