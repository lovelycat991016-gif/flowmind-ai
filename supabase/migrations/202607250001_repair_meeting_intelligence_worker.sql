-- The legacy 202607210002 migration cannot be replayed because
-- 202607210001 already introduced the failure-code column. This migration
-- restores only the missing worker contract after that legacy version is
-- recorded as applied in Supabase migration history.

alter table public.meeting_intelligence
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists result jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'meeting_intelligence_attempt_count_valid'
  ) then
    alter table public.meeting_intelligence
      add constraint meeting_intelligence_attempt_count_valid
      check (attempt_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'meeting_intelligence_max_attempts_valid'
  ) then
    alter table public.meeting_intelligence
      add constraint meeting_intelligence_max_attempts_valid
      check (max_attempts between 1 and 10);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'meeting_intelligence_result_valid'
  ) then
    alter table public.meeting_intelligence
      add constraint meeting_intelligence_result_valid
      check (result is null or jsonb_typeof(result) = 'object');
  end if;
end;
$$;

create or replace function public.claim_next_meeting_intelligence(
  p_worker_id text,
  p_lease_seconds integer
)
returns table (
  id uuid,
  meeting_id uuid,
  transcript_id uuid,
  user_id uuid,
  locked_by text
)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  return query
  with claimable as (
    select meeting_intelligence.id
    from public.meeting_intelligence
    where status = 'queued'
      and attempt_count < max_attempts
    order by created_at
    for update skip locked
    limit 1
  )
  update public.meeting_intelligence
  set
    status = 'running',
    attempt_count = meeting_intelligence.attempt_count + 1,
    locked_at = timezone('utc', now()),
    locked_by = p_worker_id,
    lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds),
    started_at = coalesce(started_at, timezone('utc', now()))
  from claimable
  where meeting_intelligence.id = claimable.id
  returning
    meeting_intelligence.id,
    meeting_intelligence.meeting_id,
    meeting_intelligence.transcript_id,
    meeting_intelligence.user_id,
    meeting_intelligence.locked_by;
end;
$$;

revoke all on function public.claim_next_meeting_intelligence(text, integer) from public;
grant execute on function public.claim_next_meeting_intelligence(text, integer) to service_role;
