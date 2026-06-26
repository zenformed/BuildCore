-- Multiple contact emails and phones per CRM contact (projects / subprojects).

alter table public.crm_contacts
  add column if not exists contact_emails text[] not null default '{}',
  add column if not exists contact_phones text[] not null default '{}';

comment on column public.crm_contacts.contact_emails is
  'Up to 4 contact emails; first entry is primary (mirrors email column).';

comment on column public.crm_contacts.contact_phones is
  'Up to 4 contact phones; first entry is primary (mirrors phone column).';

update public.crm_contacts
set
  contact_emails = case
    when email is not null and btrim(email) <> '' then array[btrim(email)]
    else '{}'::text[]
  end,
  contact_phones = case
    when phone is not null and btrim(phone) <> '' then array[btrim(phone)]
    else '{}'::text[]
  end;
