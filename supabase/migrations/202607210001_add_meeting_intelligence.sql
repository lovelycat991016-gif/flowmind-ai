create type public.meeting_intelligence_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create table public.meeting_intelligence (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  transcript_id uuid not null references public.transcripts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status public.meeting_intelligence_status not null default 'queued',
  model_identifier text,
  prompt_version text not null default 'meeting_intelligence/v1',
  output_metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meeting_intelligence_model_identifier_valid check (
    model_identifier is null or (
      model_identifier = btrim(model_identifier)
      and char_length(model_identifier) between 1 and 100
    )
  ),
  constraint meeting_intelligence_prompt_version_valid check (
    prompt_version = btrim(prompt_version)
    and char_length(prompt_version) between 1 and 100
  ),
  constraint meeting_intelligence_output_metadata_valid check (
    jsonb_typeof(output_metadata) = 'object'
  )
);

alter table public.meeting_intelligence enable row level security;

create policy "Users can view their own meeting intelligence"
on public.meeting_intelligence for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.meetings
    where meetings.id = meeting_intelligence.meeting_id
      and meetings.user_id = (select auth.uid())
  )
);

grant select on table public.meeting_intelligence to authenticated;
revoke all on table public.meeting_intelligence from anon;

create unique index meeting_intelligence_active_meeting_idx
on public.meeting_intelligence (meeting_id)
where status in ('queued', 'running', 'completed');

create index meeting_intelligence_owner_status_created_idx
on public.meeting_intelligence (user_id, status, created_at desc);

create index meeting_intelligence_transcript_idx
on public.meeting_intelligence (transcript_id);

create trigger meeting_intelligence_set_updated_at
before update on public.meeting_intelligence
for each row execute procedure public.set_updated_at();
