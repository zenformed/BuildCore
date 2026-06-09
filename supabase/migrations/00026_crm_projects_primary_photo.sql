-- ============================================================================
-- BuildCore CRM — project primary photo (parent + subproject, independent)
-- Storage bucket: buildcore-project-photos
-- Object key: buildcore/{organization_id}/projects/{project_id}/primary/{filename}
-- ============================================================================

alter table public.crm_projects
  add column if not exists primary_photo_path text;

comment on column public.crm_projects.primary_photo_path is
  'Supabase storage object key for the project primary photo (not a public URL).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'buildcore-project-photos',
  'buildcore-project-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy buildcore_project_photos_select_org
  on storage.objects for select to authenticated
  using (
    bucket_id = 'buildcore-project-photos'
    and (storage.foldername(name))[1] = 'buildcore'
    and public.crm_user_has_org_access(((storage.foldername(name))[2])::uuid)
  );

create policy buildcore_project_photos_insert_org
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'buildcore-project-photos'
    and (storage.foldername(name))[1] = 'buildcore'
    and public.crm_user_has_org_access(((storage.foldername(name))[2])::uuid)
  );

create policy buildcore_project_photos_update_org
  on storage.objects for update to authenticated
  using (
    bucket_id = 'buildcore-project-photos'
    and (storage.foldername(name))[1] = 'buildcore'
    and public.crm_user_has_org_access(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'buildcore-project-photos'
    and (storage.foldername(name))[1] = 'buildcore'
    and public.crm_user_has_org_access(((storage.foldername(name))[2])::uuid)
  );

create policy buildcore_project_photos_delete_org
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'buildcore-project-photos'
    and (storage.foldername(name))[1] = 'buildcore'
    and public.crm_user_has_org_access(((storage.foldername(name))[2])::uuid)
  );
