create type public.meeting_ai_message_role as enum ('user', 'assistant');

create table public.meeting_ai_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.meeting_ai_message_role not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meeting_ai_messages_content_valid check (
    content = btrim(content)
    and char_length(content) between 1 and 4000
  )
);

alter table public.meeting_ai_messages enable row level security;

create policy "Users can view their own meeting AI messages"
on public.meeting_ai_messages for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.meetings
    where meetings.id = meeting_ai_messages.meeting_id
      and meetings.user_id = (select auth.uid())
  )
);

create policy "Users can create messages for their own meetings"
on public.meeting_ai_messages for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.meetings
    where meetings.id = meeting_ai_messages.meeting_id
      and meetings.user_id = (select auth.uid())
  )
);

grant select, insert on table public.meeting_ai_messages to authenticated;
revoke all on table public.meeting_ai_messages from anon;

create index meeting_ai_messages_owner_meeting_created_idx
on public.meeting_ai_messages (user_id, meeting_id, created_at);

create trigger meeting_ai_messages_set_updated_at
before update on public.meeting_ai_messages
for each row execute procedure public.set_updated_at();
