create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references public.recordings (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null default 'openai',
  provider_model text not null,
  language text,
  content text not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transcripts_provider_valid check (provider = 'openai'),
  constraint transcripts_provider_model_valid check (
    provider_model = btrim(provider_model)
    and char_length(provider_model) between 1 and 100
  ),
  constraint transcripts_language_valid check (
    language is null or (
      language = btrim(language)
      and char_length(language) between 2 and 35
    )
  ),
  constraint transcripts_content_valid check (
    content = btrim(content)
    and char_length(content) between 1 and 1000000
  )
);

create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.transcripts (id) on delete cascade,
  segment_index integer not null,
  start_ms integer not null,
  end_ms integer not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint transcript_segments_order_valid unique (transcript_id, segment_index),
  constraint transcript_segments_index_valid check (segment_index >= 0),
  constraint transcript_segments_start_valid check (start_ms >= 0),
  constraint transcript_segments_end_valid check (end_ms >= start_ms),
  constraint transcript_segments_content_valid check (
    content = btrim(content)
    and char_length(content) between 1 and 100000
  )
);

alter table public.transcripts enable row level security;
alter table public.transcript_segments enable row level security;

create policy "Users can view their own transcripts"
on public.transcripts for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own transcript segments"
on public.transcript_segments for select to authenticated
using (
  exists (
    select 1 from public.transcripts
    where transcripts.id = transcript_segments.transcript_id
      and transcripts.user_id = (select auth.uid())
  )
);

grant select on table public.transcripts to authenticated;
grant select on table public.transcript_segments to authenticated;
revoke all on table public.transcripts from anon;
revoke all on table public.transcript_segments from anon;

create index transcripts_owner_completed_idx
on public.transcripts (user_id, completed_at desc);

create index transcript_segments_transcript_idx
on public.transcript_segments (transcript_id, segment_index);

create trigger transcripts_set_updated_at
before update on public.transcripts
for each row execute procedure public.set_updated_at();
