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
  if p_worker_id <> btrim(p_worker_id)
    or char_length(p_worker_id) not between 1 and 100
    or p_lease_seconds not between 1 and 3600 then
    raise exception 'invalid claim input';
  end if;

  update public.processing_jobs as pj
  set
    status = 'failed',
    failed_at = timezone('utc', now()),
    last_error_code = 'lease_expired',
    locked_at = null,
    locked_by = null,
    lease_expires_at = null
  where pj.status = 'running'
    and pj.lease_expires_at < timezone('utc', now())
    and pj.attempt_count >= pj.max_attempts;

  return query
  with claimable_job as (
    select pj.id
    from public.processing_jobs as pj
    where (
      pj.status = 'queued'
      or (
        pj.status = 'running'
        and pj.lease_expires_at < timezone('utc', now())
      )
    )
      and pj.attempt_count < pj.max_attempts
    order by pj.created_at
    for update skip locked
    limit 1
  )
  update public.processing_jobs as pj
  set
    status = 'running',
    attempt_count = pj.attempt_count + 1,
    locked_at = timezone('utc', now()),
    locked_by = p_worker_id,
    lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds),
    started_at = coalesce(pj.started_at, timezone('utc', now()))
  from claimable_job
  where pj.id = claimable_job.id
  returning
    pj.id,
    pj.recording_id,
    pj.user_id,
    pj.attempt_count,
    pj.max_attempts,
    pj.locked_at,
    pj.locked_by,
    pj.lease_expires_at;
end;
$$;

alter function public.claim_next_processing_job(text, integer) owner to postgres;

revoke all on function public.claim_next_processing_job(text, integer) from public;
revoke all on function public.claim_next_processing_job(text, integer) from anon;
revoke all on function public.claim_next_processing_job(text, integer) from authenticated;
grant execute on function public.claim_next_processing_job(text, integer) to service_role;
