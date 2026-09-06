alter table public.processing_jobs
add column next_attempt_at timestamptz;

drop index public.processing_jobs_claimable_idx;

create index processing_jobs_claimable_idx
on public.processing_jobs (
  (coalesce(next_attempt_at, '-infinity'::timestamptz)),
  created_at,
  id
)
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
    next_attempt_at = null,
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
      (
        pj.status = 'queued'
        and (
          pj.next_attempt_at is null
          or pj.next_attempt_at <= timezone('utc', now())
        )
      )
      or (
        pj.status = 'running'
        and pj.lease_expires_at < timezone('utc', now())
      )
    )
      and pj.attempt_count < pj.max_attempts
    order by pj.created_at, pj.id
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
    started_at = coalesce(pj.started_at, timezone('utc', now())),
    next_attempt_at = null,
    last_error_code = null
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

create or replace function public.fail_transcription_job(
  p_job_id uuid,
  p_worker_id text,
  p_failure_code text
)
returns void
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
    or p_failure_code not in (
      'storage_object_missing',
      'unsupported_audio_type',
      'transcription_input_too_large',
      'invalid_audio',
      'audio_format_mismatch',
      'audio_format_unsupported',
      'audio_format_unrecognized',
      'provider_rejected_audio',
      'storage_unavailable',
      'provider_rate_limited',
      'provider_unavailable',
      'provider_timeout',
      'provider_request_failed',
      'lease_expired',
      'worker_unexpected_error'
    ) then
    raise exception 'invalid failure input';
  end if;

  update public.processing_jobs as pj
  set
    status = case
      when p_failure_code in (
        'provider_timeout',
        'provider_rate_limited',
        'provider_unavailable',
        'storage_unavailable'
      ) and pj.attempt_count < pj.max_attempts
        then 'queued'::public.processing_job_status
      else 'failed'::public.processing_job_status
    end,
    failed_at = case
      when p_failure_code in (
        'provider_timeout',
        'provider_rate_limited',
        'provider_unavailable',
        'storage_unavailable'
      ) and pj.attempt_count < pj.max_attempts
        then null
      else timezone('utc', now())
    end,
    last_error_code = p_failure_code,
    next_attempt_at = case
      when p_failure_code in (
        'provider_timeout',
        'provider_rate_limited',
        'provider_unavailable',
        'storage_unavailable'
      ) and pj.attempt_count < pj.max_attempts
        then timezone('utc', now()) + case
          when pj.attempt_count = 1 then interval '1 minute'
          else interval '5 minutes'
        end
      else null
    end,
    locked_at = null,
    locked_by = null,
    lease_expires_at = null
  where pj.id = p_job_id
    and pj.status = 'running'
    and pj.locked_by = p_worker_id
    and pj.lease_expires_at > timezone('utc', now());

  if not found then
    raise exception 'invalid job lease';
  end if;
end;
$$;

alter function public.fail_transcription_job(uuid, text, text) owner to postgres;

revoke all on function public.fail_transcription_job(uuid, text, text) from public;
revoke all on function public.fail_transcription_job(uuid, text, text) from anon;
revoke all on function public.fail_transcription_job(uuid, text, text) from authenticated;
grant execute on function public.fail_transcription_job(uuid, text, text) to service_role;
