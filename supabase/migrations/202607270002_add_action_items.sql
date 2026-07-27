create type public.action_item_priority as enum ('low', 'medium', 'high');
create type public.action_item_status as enum ('open', 'in_progress', 'completed', 'cancelled');

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  owner text,
  priority public.action_item_priority not null default 'medium',
  status public.action_item_status not null default 'open',
  due_date date,
  source_intelligence_id uuid references public.meeting_intelligence (id) on delete set null,
  source_action_item_index integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint action_items_title_valid check (title = btrim(title) and char_length(title) between 1 and 500),
  constraint action_items_description_valid check (description is null or (description = btrim(description) and char_length(description) <= 4000)),
  constraint action_items_owner_valid check (owner is null or (owner = btrim(owner) and char_length(owner) between 1 and 200)),
  constraint action_items_source_valid check (
    (source_intelligence_id is null and source_action_item_index is null)
    or (source_intelligence_id is not null and source_action_item_index >= 0)
  )
);

alter table public.action_items enable row level security;

create policy "Users can view their own action items"
on public.action_items for select to authenticated
using ((select auth.uid()) = user_id and exists (select 1 from public.meetings where meetings.id = action_items.meeting_id and meetings.user_id = (select auth.uid())));
create policy "Users can create action items for active own meetings"
on public.action_items for insert to authenticated
with check ((select auth.uid()) = user_id and exists (select 1 from public.meetings where meetings.id = action_items.meeting_id and meetings.user_id = (select auth.uid()) and meetings.archived_at is null));
create policy "Users can update action items for active own meetings"
on public.action_items for update to authenticated
using ((select auth.uid()) = user_id and exists (select 1 from public.meetings where meetings.id = action_items.meeting_id and meetings.user_id = (select auth.uid()) and meetings.archived_at is null))
with check ((select auth.uid()) = user_id);
create policy "Users can delete action items for active own meetings"
on public.action_items for delete to authenticated
using ((select auth.uid()) = user_id and exists (select 1 from public.meetings where meetings.id = action_items.meeting_id and meetings.user_id = (select auth.uid()) and meetings.archived_at is null));

grant select, insert, update, delete on table public.action_items to authenticated;
revoke all on table public.action_items from anon;

create unique index action_items_intelligence_source_idx on public.action_items (source_intelligence_id, source_action_item_index) where source_intelligence_id is not null;
create index action_items_owner_status_created_idx on public.action_items (user_id, status, created_at desc);
create index action_items_meeting_created_idx on public.action_items (meeting_id, created_at desc);
create trigger action_items_set_updated_at before update on public.action_items for each row execute procedure public.set_updated_at();
