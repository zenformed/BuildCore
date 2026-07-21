-- Optional project map coordinates (Phase 1: display only; no geocoding/editing UI).

alter table public.crm_projects
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.crm_projects.latitude is
  'Optional WGS84 latitude for map display. Must be set together with longitude.';
comment on column public.crm_projects.longitude is
  'Optional WGS84 longitude for map display. Must be set together with latitude.';

alter table public.crm_projects
  drop constraint if exists crm_projects_coordinates_pair_chk;

alter table public.crm_projects
  add constraint crm_projects_coordinates_pair_chk
  check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude >= -90
      and latitude <= 90
      and longitude >= -180
      and longitude <= 180
    )
  );
