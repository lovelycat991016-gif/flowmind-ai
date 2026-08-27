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

  update public.processing_jobs
  set
    status = 'failed',
    failed_at = timezone('utc', now()),
    last_error_code = p_failure_code,
    locked_at = null,
    locked_by = null,
    lease_expires_at = null
  where id = p_job_id
    and status = 'running'
    and locked_by = p_worker_id
    and lease_expires_at > timezone('utc', now());

  if not found then
    raise exception 'invalid job lease';
  end if;
end;
$$;
