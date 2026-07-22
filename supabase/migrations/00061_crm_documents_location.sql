-- Optional capture location for CRM documents / photos (shared Photos + Documents viewer).
-- Existing rows remain null; no reverse-geocoding.

alter table public.crm_documents
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_accuracy_meters double precision,
  add column if not exists location_source text,
  add column if not exists location_captured_at timestamptz;

alter table public.crm_documents
  drop constraint if exists crm_documents_location_source_check;

alter table public.crm_documents
  add constraint crm_documents_location_source_check
  check (
    location_source is null
    or location_source in ('device_capture', 'exif', 'manual')
  );

comment on column public.crm_documents.latitude is
  'Optional WGS84 latitude for the media capture location.';
comment on column public.crm_documents.longitude is
  'Optional WGS84 longitude for the media capture location.';
comment on column public.crm_documents.location_accuracy_meters is
  'Optional horizontal accuracy in meters when provided by the capture device.';
comment on column public.crm_documents.location_source is
  'Origin of coordinates: device_capture | exif | manual.';
comment on column public.crm_documents.location_captured_at is
  'When the location was captured or extracted (may differ from created_at).';
