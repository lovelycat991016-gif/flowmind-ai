create type public.processing_job_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_type text not null default 'recording_processing',
  status public.processing_job_status not null default 'queued',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint processing_jobs_type_valid check (
    job_type = 'recording_processing'
  ),
  constraint processing_jobs_attempt_count_valid check (
    attempt_count >= 0
  ),
  constraint processing_jobs_max_attempts_valid check (
    max_attempts between 1 and 10
  ),
  constraint processing_jobs_attempts_within_limit check (
    attempt_count <= max_attempts
  )
);

alter table public.processing_jobs enable row level security;

create policy "Users can view their own processing jobs"
on public.processing_jobs for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can queue processing for their uploaded recordings"
on public.processing_jobs for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.recordings
    where recordings.id = recording_id
      and recordings.user_id = (select auth.uid())
      and recordings.status = 'uploaded'
  )
);

grant select, insert on table public.processing_jobs to authenticated;
revoke all on table public.processing_jobs from anon;

create unique index processing_jobs_active_recording_idx
on public.processing_jobs (recording_id)
where status in ('queued', 'running');

create index processing_jobs_owner_status_created_idx
on public.processing_jobs (user_id, status, created_at desc);

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute procedure public.set_updated_at();
