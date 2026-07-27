alter table public.meeting_knowledge_jobs
  add column locked_at timestamptz,
  add column locked_by text,
  add column lease_expires_at timestamptz;

create or replace function public.claim_next_meeting_knowledge_job(p_worker_id text, p_lease_seconds integer)
returns table (id uuid, meeting_id uuid, user_id uuid, transcript_id uuid, locked_by text)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'not authorized'; end if;
  return query with candidate as (
    select meeting_knowledge_jobs.id from public.meeting_knowledge_jobs
    where status = 'queued' or (status = 'processing' and lease_expires_at < timezone('utc', now()))
    order by created_at for update skip locked limit 1
  ) update public.meeting_knowledge_jobs set status = 'processing', attempt_count = attempt_count + 1, locked_at = timezone('utc', now()), locked_by = p_worker_id, lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds)
  from candidate where meeting_knowledge_jobs.id = candidate.id
  returning meeting_knowledge_jobs.id, meeting_knowledge_jobs.meeting_id, meeting_knowledge_jobs.user_id, meeting_knowledge_jobs.transcript_id, meeting_knowledge_jobs.locked_by;
end; $$;
revoke all on function public.claim_next_meeting_knowledge_job(text, integer) from public;
grant execute on function public.claim_next_meeting_knowledge_job(text, integer) to service_role;
