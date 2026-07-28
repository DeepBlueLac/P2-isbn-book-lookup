create extension if not exists pgcrypto;

create table if not exists public.shelfmark_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('search', 'download')),
  subject_kind text not null check (subject_kind in ('guest', 'user')),
  subject_id text not null,
  normalized_query text,
  search_mode text check (search_mode in ('isbn', 'search')),
  result_count integer check (result_count is null or result_count >= 0),
  downloadable_count integer check (downloadable_count is null or downloadable_count >= 0),
  zlibrary_status text check (zlibrary_status is null or zlibrary_status in ('available', 'unavailable', 'skipped')),
  download_book_id text,
  download_format text,
  quota_downloads_used integer check (quota_downloads_used is null or quota_downloads_used >= 0),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists shelfmark_usage_events_created_at_idx
  on public.shelfmark_usage_events (created_at desc);

create index if not exists shelfmark_usage_events_subject_day_idx
  on public.shelfmark_usage_events (subject_kind, subject_id, ((created_at at time zone 'utc')::date));

create index if not exists shelfmark_usage_events_search_idx
  on public.shelfmark_usage_events (normalized_query, created_at desc)
  where event_type = 'search';

create table if not exists public.shelfmark_quota_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject_kind text not null check (subject_kind in ('guest', 'user')),
  subject_id text not null,
  email text,
  expected_daily_downloads text not null check (expected_daily_downloads in ('20', '50', '100', 'unlimited')),
  use_case text not null check (use_case in ('personal_reading', 'study_research', 'collection_management', 'other')),
  status text not null default 'recorded' check (status in ('recorded', 'reviewing', 'closed')),
  internal_note text
);

create index if not exists shelfmark_quota_requests_created_at_idx
  on public.shelfmark_quota_requests (created_at desc);

create index if not exists shelfmark_quota_requests_status_idx
  on public.shelfmark_quota_requests (status, created_at desc);

create or replace function public.shelfmark_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shelfmark_quota_requests_touch_updated_at on public.shelfmark_quota_requests;

create trigger shelfmark_quota_requests_touch_updated_at
before update on public.shelfmark_quota_requests
for each row
execute function public.shelfmark_touch_updated_at();

create or replace view public.shelfmark_daily_usage as
select
  (created_at at time zone 'utc')::date as usage_date,
  subject_kind,
  subject_id,
  count(*) filter (where event_type = 'search')::integer as searches,
  count(*) filter (where event_type = 'download')::integer as downloads,
  max(created_at) as last_event_at
from public.shelfmark_usage_events
group by 1, 2, 3;

alter table public.shelfmark_usage_events enable row level security;
alter table public.shelfmark_quota_requests enable row level security;

drop policy if exists "service role manages usage events" on public.shelfmark_usage_events;
create policy "service role manages usage events"
on public.shelfmark_usage_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages quota requests" on public.shelfmark_quota_requests;
create policy "service role manages quota requests"
on public.shelfmark_quota_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
