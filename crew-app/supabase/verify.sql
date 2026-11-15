-- Run in the Supabase SQL Editor after the app_storage migration.
-- Confirms all three tables exist and contain their safe setup records.
select
  (select count(*) from public.data_sources) as data_sources_rows,
  (select count(*) from public.app_state) as app_state_rows,
  (select count(*) from public.nasa_search_cache) as nasa_search_cache_rows,
  exists (
    select 1 from public.app_state where profile_id = '__sagecare_connection_check__'
  ) as app_state_check_present,
  exists (
    select 1 from public.nasa_search_cache where query_key = '__sagecare_connection_check__'
  ) as nasa_cache_check_present;
