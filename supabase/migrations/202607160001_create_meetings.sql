create extension if not exists pg_trgm with schema extensions;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  meeting_date timestamptz not null,
  duration_seconds integer,
  participant_count integer,
  processing_status text,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meetings_title_valid check (
    title = btrim(title) and char_length(title) between 1 and 200
  ),
  constraint meetings_duration_nonnegative check (
    duration_seconds is null or duration_seconds >= 0
  ),
  constraint meetings_participant_count_nonnegative check (
    participant_count is null or participant_count >= 0
  )
);

alter table public.meetings enable row level security;

create policy "Users can view their own meetings"
on public.meetings for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own meetings"
on public.meetings for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own meetings"
on public.meetings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own meetings"
on public.meetings for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.meetings to authenticated;
revoke all on table public.meetings from anon;

create index meetings_active_date_idx
on public.meetings (user_id, meeting_date, id)
where archived_at is null;

create index meetings_archived_date_idx
on public.meetings (user_id, meeting_date, id)
where archived_at is not null;

create index meetings_active_title_idx
on public.meetings (user_id, title, id)
where archived_at is null;

create index meetings_archived_title_idx
on public.meetings (user_id, title, id)
where archived_at is not null;

create index meetings_title_search_idx
on public.meetings using gin (title extensions.gin_trgm_ops);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute procedure public.set_updated_at();
