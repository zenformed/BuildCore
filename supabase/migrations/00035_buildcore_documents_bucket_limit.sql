-- Direct-upload launch: raise buildcore-documents bucket ceiling to 250 MiB.
-- Per-type limits (25 MB images, 50 MB documents, 250 MB videos) remain in application policy.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'buildcore-documents',
  'buildcore-documents',
  false,
  262144000,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
