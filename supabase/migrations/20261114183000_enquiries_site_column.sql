-- Applied to project "avspmc" on 2026-11-14 (migration name: enquiries_site_column).
-- Which website an enquiry came from: the AVSPMC site (pmc) or the ATIVEER solar site (solar.avsllp.co).
alter table public.enquiries
  add column if not exists site text not null default 'pmc'
  constraint enquiries_site_check check (site in ('pmc', 'solar'));

comment on column public.enquiries.site is 'Which website sent the enquiry: pmc (avspmc.avsllp.co) or solar (solar.avsllp.co).';

-- Solar enquiries saved before this column existed are recognisable by their project type.
update public.enquiries set site = 'solar' where site = 'pmc' and sector like 'Solar EPC:%';
