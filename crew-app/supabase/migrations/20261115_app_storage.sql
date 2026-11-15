create table if not exists public.data_sources (
  id text primary key,
  name text not null,
  publisher text not null,
  url text not null default '',
  access_note text not null
);

create table if not exists public.app_state (
  profile_id text not null,
  domain text not null check (domain in ('crew', 'monitoring', 'settings')),
  payload jsonb not null,
  source_id text not null references public.data_sources(id),
  updated_at timestamptz not null default now(),
  primary key (profile_id, domain)
);

create table if not exists public.nasa_search_cache (
  query_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  source_id text not null references public.data_sources(id)
);

alter table public.data_sources enable row level security;
alter table public.app_state enable row level security;
alter table public.nasa_search_cache enable row level security;

revoke all on public.data_sources, public.app_state, public.nasa_search_cache from anon, authenticated;
grant all on public.data_sources, public.app_state, public.nasa_search_cache to service_role;

insert into public.data_sources (id, name, publisher, url, access_note) values
  ('nasa-osdr', 'Open Science Data Repository', 'NASA', 'https://osdr.nasa.gov/bio/repo/', 'Public study metadata; file access varies by study.'),
  ('nasa-hrr', 'Human Research Roadmap', 'NASA', 'https://humanresearchroadmap.nasa.gov/', 'Public evidence reports and risk references.'),
  ('usda-fdc', 'FoodData Central', 'USDA', 'https://fdc.nal.usda.gov/', 'Public food nutrient reference data.'),
  ('crew-entry', 'Crew-entered record', 'SageCare', '', 'Entered in this app; not independently verified.'),
  ('provided-reference', 'Provided nutrient reference', 'SageCare', '', 'Nutrient values supplied for this demo catalog.'),
  ('demo-estimate', 'SageCare demo estimate', 'SageCare', '', 'Illustrative sample data, not flight telemetry.'),
  ('mixed-records', 'Mixed record sources', 'SageCare', '', 'Each field retains its own source label where available.'),
  ('legacy-migration', 'Migrated browser or SQLite data', 'SageCare', '', 'Imported from previous app storage.'),
  ('connection-check', 'SageCare setup check', 'SageCare', '', 'Synthetic connectivity record; not crew health data.')
on conflict (id) do update set
  name = excluded.name,
  publisher = excluded.publisher,
  url = excluded.url,
  access_note = excluded.access_note;

-- Safe sample rows make all three tables visible and testable immediately.
-- These records are synthetic and deliberately ignored by crew profile views.
insert into public.app_state (profile_id, domain, payload, source_id)
values (
  '__sagecare_connection_check__',
  'settings',
  '{"status":"ok","kind":"synthetic-check"}'::jsonb,
  'connection-check'
)
on conflict (profile_id, domain) do nothing;

insert into public.nasa_search_cache (query_key, payload, source_id)
values (
  '__sagecare_connection_check__',
  '[]'::jsonb,
  'nasa-osdr'
)
on conflict (query_key) do nothing;
