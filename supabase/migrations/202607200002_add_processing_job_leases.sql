alter table public.processing_jobs
add column lease_expires_at timestamptz;

create index processing_jobs_claimable_idx
on public.processing_jobs (created_at)
where status = 'queued' and attempt_count < max_attempts;

create or replace function public.claim_next_processing_job(
  p_worker_id text,
  p_lease_seconds integer
)
returns table (
  id uuid,
  recording_id uuid,
  user_id uuid,
  attempt_count integer,
  max_attempts integer,
  locked_at timestamptz,
  locked_by text,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  if p_worker_id <> btrim(p_worker_id)
    or char_length(p_worker_id) not between 1 and 100
    or p_lease_seconds not between 1 and 3600 then
    raise exception 'invalid claim input';
  end if;

  return query
  with claimable_job as (
    select processing_jobs.id
    from public.processing_jobs
    where status = 'queued'
      and attempt_count < max_attempts
    order by created_at
    for update skip locked
    limit 1
  )
  update public.processing_jobs
  set
    status = 'running',
    attempt_count = processing_jobs.attempt_count + 1,
    locked_at = timezone('utc', now()),
    locked_by = p_worker_id,
    lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds),
    started_at = coalesce(processing_jobs.started_at, timezone('utc', now()))
  from claimable_job
  where processing_jobs.id = claimable_job.id
  returning
    processing_jobs.id,
    processing_jobs.recording_id,
    processing_jobs.user_id,
    processing_jobs.attempt_count,
    processing_jobs.max_attempts,
    processing_jobs.locked_at,
    processing_jobs.locked_by,
    processing_jobs.lease_expires_at;
end;
$$;

revoke all on function public.claim_next_processing_job(text, integer) from public;
grant execute on function public.claim_next_processing_job(text, integer) to service_role;
