-- Rename trade_type -> industry, expand allowed values, add custom_industry for "other".
-- Safe to re-run: skips steps already applied.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_projects'
      and column_name = 'trade_type'
  ) then
    alter table public.crm_projects rename column trade_type to industry;
  end if;
end $$;

alter table public.crm_projects
  add column if not exists custom_industry text null;

alter table public.crm_projects
  drop constraint if exists crm_projects_trade_type_check;

update public.crm_projects
set
  industry = 'other',
  custom_industry = 'Make Ready'
where industry = 'make-ready';

alter table public.crm_projects
  drop constraint if exists crm_projects_industry_check;

alter table public.crm_projects
  add constraint crm_projects_industry_check
  check (industry in (
    'hvac',
    'roofing',
    'restoration',
    'inspections',
    'general-contractor',
    'electrical',
    'plumbing',
    'painting',
    'flooring',
    'landscaping',
    'tree-service',
    'pool-construction',
    'property-management',
    'cleaning-services',
    'handyman-services',
    'real-estate',
    'wedding-planning',
    'event-planning',
    'photography',
    'videography',
    'marketing-agency',
    'it-services',
    'manufacturing',
    'fabrication',
    'consulting',
    'other'
  ));

alter table public.crm_projects
  drop constraint if exists crm_projects_custom_industry_check;

alter table public.crm_projects
  add constraint crm_projects_custom_industry_check
  check (
    (industry <> 'other' and custom_industry is null)
    or (
      industry = 'other'
      and custom_industry is not null
      and length(trim(custom_industry)) > 0
    )
  );

comment on column public.crm_projects.industry is
  'Project industry vertical for filtering/display (domain CrmIndustry).';

comment on column public.crm_projects.custom_industry is
  'Free-text industry label when industry is other; null otherwise.';
