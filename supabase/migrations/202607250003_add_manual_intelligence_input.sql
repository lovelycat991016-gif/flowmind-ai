alter table public.meeting_intelligence
  alter column transcript_id drop not null,
  add column input_text text;

alter table public.meeting_intelligence
  add constraint meeting_intelligence_input_source_valid check (
    (transcript_id is not null and input_text is null)
    or (transcript_id is null and input_text is not null)
  ),
  add constraint meeting_intelligence_input_text_valid check (
    input_text is null
    or (
      input_text = btrim(input_text)
      and char_length(input_text) between 1 and 100000
    )
  );

create policy "Users can create their own meeting intelligence"
on public.meeting_intelligence for insert to authenticated
with check (
  meeting_intelligence.user_id = (select auth.uid())
  and exists (
    select 1 from public.meetings
    where meetings.id = meeting_intelligence.meeting_id
      and meetings.user_id = (select auth.uid())
      and meetings.archived_at is null
  )
);

grant insert on table public.meeting_intelligence to authenticated;
