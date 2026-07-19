create type public.recording_upload_status as enum (
  'pending',
  'uploading',
  'uploaded',
  'failed',
  'cancelled'
);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_bucket text not null default 'recordings',
  storage_path text unique not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  status public.recording_upload_status not null default 'pending',
  uploaded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recordings_storage_bucket_valid check (storage_bucket = 'recordings'),
  constraint recordings_filename_valid check (
    original_filename = btrim(original_filename)
    and char_length(original_filename) between 1 and 255
  ),
  constraint recordings_mime_type_valid check (
    mime_type in ('audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm')
  ),
  constraint recordings_file_size_valid check (
    file_size_bytes between 1 and 524288000
  )
);

alter table public.recordings enable row level security;

create policy "Users can view their own recordings"
on public.recordings for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create recordings for their own meetings"
on public.recordings for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.meetings
    where meetings.id = meeting_id
      and meetings.user_id = (select auth.uid())
  )
);

create policy "Users can update their own recordings"
on public.recordings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.recordings to authenticated;
revoke all on table public.recordings from anon;

create unique index recordings_active_meeting_idx
on public.recordings (meeting_id)
where status in ('pending', 'uploading', 'uploaded');

create index recordings_owner_meeting_created_idx
on public.recordings (user_id, meeting_id, created_at desc);

create trigger recordings_set_updated_at
before update on public.recordings
for each row execute procedure public.set_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'recordings',
  'recordings',
  false,
  524288000,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm']::text[]
);

create policy "Users can view their own recording objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'recordings'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "Users can upload their own recording objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'recordings'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "Users can delete their own recording objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'recordings'
  and split_part(name, '/', 1) = (select auth.uid())::text
);
