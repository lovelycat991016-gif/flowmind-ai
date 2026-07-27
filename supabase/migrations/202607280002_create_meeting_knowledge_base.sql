create extension if not exists vector;

create type public.meeting_knowledge_job_status as enum ('queued', 'processing', 'completed', 'failed');

create table public.meeting_knowledge_jobs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  transcript_id uuid not null references public.transcripts (id) on delete cascade,
  status public.meeting_knowledge_job_status not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (transcript_id)
);

create table public.meeting_document_chunks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  transcript_id uuid not null references public.transcripts (id) on delete cascade,
  content text not null check (content = btrim(content) and char_length(content) between 1 and 2000),
  chunk_index integer not null check (chunk_index >= 0),
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc', now()),
  unique (transcript_id, chunk_index)
);

alter table public.meeting_knowledge_jobs enable row level security;
alter table public.meeting_document_chunks enable row level security;

create policy "Users can view their own meeting knowledge jobs" on public.meeting_knowledge_jobs for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.meetings where meetings.id = meeting_knowledge_jobs.meeting_id and meetings.user_id = (select auth.uid())));
create policy "Users can view their own meeting document chunks" on public.meeting_document_chunks for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.meetings where meetings.id = meeting_document_chunks.meeting_id and meetings.user_id = (select auth.uid())));

create index meeting_knowledge_jobs_owner_status_idx on public.meeting_knowledge_jobs (user_id, status, created_at desc);
create index meeting_document_chunks_owner_meeting_idx on public.meeting_document_chunks (user_id, meeting_id, chunk_index);
create trigger meeting_knowledge_jobs_set_updated_at before update on public.meeting_knowledge_jobs for each row execute procedure public.set_updated_at();

revoke all on table public.meeting_knowledge_jobs from anon;
revoke all on table public.meeting_document_chunks from anon;
grant select on table public.meeting_knowledge_jobs, public.meeting_document_chunks to authenticated;
grant select, insert, update, delete on table public.meeting_knowledge_jobs, public.meeting_document_chunks to service_role;
