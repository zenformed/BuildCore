-- Remove 1-minute testing frequency from allowed customer task reminder intervals.

update public.buildcore_organization_settings
set customer_task_reminder_frequency_minutes = 1440
where customer_task_reminder_frequency_minutes = 1;

alter table public.buildcore_organization_settings
  drop constraint if exists buildcore_organization_settings_customer_task_reminder_frequency_minutes_check;

alter table public.buildcore_organization_settings
  add constraint buildcore_organization_settings_customer_task_reminder_frequency_minutes_check
  check (customer_task_reminder_frequency_minutes in (1440, 4320, 10080, 43200));

comment on column public.buildcore_organization_settings.customer_task_reminder_frequency_minutes is
  'Minutes between customer task reminder emails (1440=24h, 4320=3d, 10080=1w, 43200=1mo).';
