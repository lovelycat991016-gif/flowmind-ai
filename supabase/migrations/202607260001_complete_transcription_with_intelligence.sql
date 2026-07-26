create or replace function public.complete_transcription_job(
  p_job_id uuid,
  p_worker_id text,
  p_recording_id uuid,
  p_user_id uuid,
  p_provider text,
  p_provider_model text,
  p_language text,
  p_content text,
  p_segments jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting_id uuid;
  v_transcript_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  if p_worker_id <> btrim(p_worker_id)
    or char_length(p_worker_id) not between 1 and 100
    or jsonb_typeof(p_segments) <> 'array'
    or jsonb_array_length(p_segments) = 0 then
    raise exception 'invalid completion input';
  end if;

  select meetings.id
  into v_meeting_id
  from public.processing_jobs
  join public.recordings
    on recordings.id = processing_jobs.recording_id
  join public.meetings
    on meetings.id = recordings.meeting_id
  where processing_jobs.id = p_job_id
    and processing_jobs.recording_id = p_recording_id
    and processing_jobs.user_id = p_user_id
    and recordings.user_id = processing_jobs.user_id
    and meetings.user_id = processing_jobs.user_id
    and processing_jobs.status = 'running'
    and processing_jobs.locked_by = p_worker_id
    and processing_jobs.lease_expires_at > timezone('utc', now())
  for update;

  if not found then
    raise exception 'invalid job lease';
  end if;

  insert into public.transcripts (
    recording_id,
    user_id,
    provider,
    provider_model,
    language,
    content,
    completed_at
  )
  values (
    p_recording_id,
    p_user_id,
    p_provider,
    p_provider_model,
    nullif(btrim(p_language), ''),
    btrim(p_content),
    timezone('utc', now())
  )
  returning id into v_transcript_id;

  insert into public.transcript_segments (
    transcript_id,
    segment_index,
    start_ms,
    end_ms,
    content
  )
  select
    v_transcript_id,
    segment.segment_index,
    segment.start_ms,
    segment.end_ms,
    btrim(segment.content)
  from jsonb_to_recordset(p_segments) as segment(
    segment_index integer,
    start_ms integer,
    end_ms integer,
    content text
  );

  insert into public.meeting_intelligence (
    meeting_id,
    transcript_id,
    user_id,
    status,
    attempt_count
  )
  values (
    v_meeting_id,
    v_transcript_id,
    p_user_id,
    'queued',
    0
  )
  on conflict (meeting_id)
    where (status in ('queued', 'running', 'completed'))
    do nothing;

  update public.processing_jobs
  set
    status = 'completed',
    completed_at = timezone('utc', now()),
    locked_at = null,
    locked_by = null,
    lease_expires_at = null
  where id = p_job_id
    and status = 'running'
    and locked_by = p_worker_id;

  if not found then
    raise exception 'unable to complete job';
  end if;
end;
$$;

revoke all on function public.complete_transcription_job(uuid, text, uuid, uuid, text, text, text, text, jsonb) from public;
grant execute on function public.complete_transcription_job(uuid, text, uuid, uuid, text, text, text, text, jsonb) to service_role;
