# Sprint 3 Meeting Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver owner-isolated Meeting Management with PostgreSQL-backed CRUD, URL-driven list controls, responsive route states, and live dashboard meeting data.

**Architecture:** App Router Server Components call focused Supabase server query functions; Server Actions own validated mutations and route revalidation. PostgreSQL constraints and RLS are the final integrity and authorization boundary, while Client Components are limited to form state, URL controls, and the delete confirmation dialog.

**Tech Stack:** Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS, shadcn/ui conventions, Supabase SSR, PostgreSQL RLS, Zod 4, Vitest, Testing Library, and the in-app browser QA workflow.

---

### Task 1: Meetings Migration And Database Contract

**Files:**

- Create: `supabase/migrations/202607160001_create_meetings.sql`
- Create: `src/features/meetings/schemas/meeting-migration.test.ts`

- [ ] **Step 1: Write the failing migration contract test**

Read the migration with `readFileSync` and assert that it defines all approved columns, title and numeric constraints, four owner policies, grants, partial date/title indexes, trigram search, and the `meetings_set_updated_at` trigger.

```ts
const migration = readFileSync(
  path.resolve("supabase/migrations/202607160001_create_meetings.sql"),
  "utf8",
).toLowerCase();

expect(migration).toContain("create table public.meetings");
expect(migration).toContain("title = btrim(title)");
expect(migration).toContain("before update on public.meetings");
expect(migration.match(/create policy/g)).toHaveLength(4);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/features/meetings/schemas/meeting-migration.test.ts`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Add the migration**

Implement the approved schema and reuse Sprint 1's timestamp function:

```sql
create extension if not exists pg_trgm with schema extensions;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  meeting_date timestamptz not null,
  duration_seconds integer,
  participant_count integer,
  processing_status text,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meetings_title_valid check (
    title = btrim(title) and char_length(title) between 1 and 200
  ),
  constraint meetings_duration_nonnegative check (
    duration_seconds is null or duration_seconds >= 0
  ),
  constraint meetings_participant_count_nonnegative check (
    participant_count is null or participant_count >= 0
  )
);

alter table public.meetings enable row level security;

create policy "Users can view their own meetings"
on public.meetings for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own meetings"
on public.meetings for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own meetings"
on public.meetings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own meetings"
on public.meetings for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.meetings to authenticated;
revoke all on table public.meetings from anon;

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute procedure public.set_updated_at();
```

Add partial `(user_id, meeting_date, id)` and `(user_id, title, id)` indexes for active and archived rows, plus `using gin (title extensions.gin_trgm_ops)` for substring search.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/features/meetings/schemas/meeting-migration.test.ts`

Expected: PASS.

```bash
git add supabase/migrations/202607160001_create_meetings.sql src/features/meetings/schemas/meeting-migration.test.ts
git commit -m "feat: add owner-isolated meetings schema"
```

### Task 2: Meeting Input And URL-State Schemas

**Files:**

- Create: `src/features/meetings/schemas/meeting-input.ts`
- Create: `src/features/meetings/schemas/meeting-input.test.ts`
- Create: `src/features/meetings/schemas/meeting-list-state.ts`
- Create: `src/features/meetings/schemas/meeting-list-state.test.ts`

- [ ] **Step 1: Write failing schema tests**

Cover title trimming, blank and 201-character titles, valid and invalid local dates, timezone offsets, UUID action IDs, list defaults, every approved sort/filter, invalid pages, and state-preserving URL generation.

```ts
expect(parseMeetingListState({})).toEqual({
  q: "",
  filter: "active",
  sort: "date-desc",
  page: 1,
});

expect(
  buildMeetingListHref(
    { q: "weekly", filter: "archived", sort: "title-asc", page: 2 },
    { page: 3 },
  ),
).toBe("/meetings?q=weekly&filter=archived&sort=title-asc&page=3");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/meetings/schemas`

Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement schemas and helpers**

Define `MeetingFilter`, `MeetingSort`, and `MeetingListState`. Normalize unknown or array-valued search params to approved defaults. Omit default values from generated URLs only if tests preserve equivalent state.

For create input, accept `meetingDateLocal` and `timezoneOffset`. Convert browser local time to an ISO timestamp by adding `getTimezoneOffset()` minutes to the local-as-UTC timestamp. Rename accepts title only. Lifecycle/delete actions validate a UUID.

```ts
export const meetingTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a meeting title.")
  .max(200, "Meeting titles must be 200 characters or fewer.");

export const meetingIdSchema = z.uuid("The meeting identifier is invalid.");
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/features/meetings/schemas`

Expected: PASS.

```bash
git add src/features/meetings/schemas
git commit -m "feat: define meeting input and list contracts"
```

### Task 3: Meeting Domain Types And Query Plans

**Files:**

- Modify: `src/entities/meeting/model/meeting.ts`
- Create: `src/features/meetings/queries/meeting-query-plan.ts`
- Create: `src/features/meetings/queries/meeting-query-plan.test.ts`
- Create: `src/features/meetings/queries/get-meetings.ts`
- Create: `src/features/meetings/queries/get-meetings.test.ts`
- Create: `src/features/meetings/queries/get-dashboard-meetings.ts`
- Create: `src/features/meetings/queries/get-dashboard-meetings.test.ts`

- [ ] **Step 1: Write failing query-plan tests**

Test active/archived predicates, title search, four order modes, stable ID ordering, offset ranges, and 21-row slicing.

```ts
expect(createMeetingQueryPlan(defaultState)).toMatchObject({
  archived: false,
  orderColumn: "meeting_date",
  ascending: false,
  from: 0,
  to: 20,
});

expect(toMeetingPage(Array.from({ length: 21 }, makeRow))).toEqual({
  meetings: expect.toHaveLength(20),
  hasNextPage: true,
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/meetings/queries/meeting-query-plan.test.ts`

Expected: FAIL because the query-plan module is missing.

- [ ] **Step 3: Implement domain and pure query contracts**

Replace Sprint 2 display-only meeting fields with database-aligned types using ISO strings. Keep formatting functions pure and locale-aware. Define `MeetingListItem`, `MeetingDetail`, `MeetingPage`, and `DashboardMeetingMetrics`.

- [ ] **Step 4: Implement Supabase server queries**

`getMeetingsPage(state)` must apply lifecycle, optional `ilike` title search, approved ordering, stable ID ordering, and `.range(from, to)`. Throw a generic query error when Supabase returns an error.

`getMeetingById(id)` returns `null` for both missing and RLS-hidden rows.

`getDashboardMeetingData()` runs query-based counts for total, active, archived, and active meetings since the current week start, then queries the latest four active meetings.

- [ ] **Step 5: Test the Supabase query boundary**

Mock `createClient()` with a chainable Supabase query double. Assert the meeting list calls `.range(from, to)`, applies `is("archived_at", null)` or `not("archived_at", "is", null)`, applies `ilike("title", "%query%")` only when search is present, and emits both primary and stable ID order calls. Assert dashboard counts use `{ count: "exact", head: true }` and Recent Meetings filters `archived_at` to null with a four-row limit.

Run: `npm test -- src/features/meetings/queries`

Expected: PASS with list, detail, and dashboard query contracts covered.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/features/meetings/queries src/entities/meeting`

Expected: PASS.

```bash
git add src/entities/meeting src/features/meetings/queries
git commit -m "feat: add indexed meeting query layer"
```

### Task 4: Meeting List Route And Responsive UI

**Files:**

- Create: `src/app/meetings/page.tsx`
- Create: `src/app/meetings/layout.tsx`
- Create: `src/widgets/app-shell/ui/authenticated-app-shell.tsx`
- Create: `src/features/meetings/ui/meeting-list-controls.tsx`
- Create: `src/features/meetings/ui/meeting-list-controls.test.tsx`
- Create: `src/widgets/meetings/ui/meeting-list.tsx`
- Create: `src/widgets/meetings/ui/meeting-list.test.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/widgets/app-shell/model/navigation.ts`
- Modify: `src/widgets/app-shell/ui/app-sidebar.tsx`
- Modify: `src/widgets/app-shell/ui/app-shell.test.tsx`

- [ ] **Step 1: Write failing list and control tests**

Assert one search input, active/archived controls, four sort options, New Meeting link, 20-row rendering, archived badges, state-preserving Previous/Next links, distinct empty/search-empty copy, and pathname-derived Dashboard/Meetings active navigation.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/meetings/ui/meeting-list-controls.test.tsx src/widgets/meetings/ui/meeting-list.test.tsx`

Expected: FAIL with missing components.

- [ ] **Step 3: Implement the route and UI**

Extract the current dashboard authentication and preview behavior into `AuthenticatedAppShell`, then use it from both dashboard and meetings layouts. The Server Component awaits `searchParams`, normalizes them, calls `getMeetingsPage`, and renders the toolbar and list. Use a compact desktop table-like grid and mobile card rows without horizontal scrolling. Meeting titles link to `/meetings/[id]`.

The search form submits GET parameters. Filter links and pagination use `buildMeetingListHref`. A small Client Component may update the URL when the sort menu changes, but it must not fetch meeting data.

Update Dashboard navigation to `/dashboard` and Meetings navigation to `/meetings`. Use `usePathname()` in the sidebar to set `aria-current="page"`; do not keep a static active flag in the navigation model.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/features/meetings/ui src/widgets/meetings/ui`

Expected: PASS.

```bash
git add src/app/dashboard/layout.tsx src/app/meetings src/features/meetings/ui src/widgets/meetings src/widgets/app-shell
git commit -m "feat: add searchable paginated meeting list"
```

### Task 5: Create Meeting Workflow

**Files:**

- Create: `src/features/meetings/actions/meeting-action-state.ts`
- Create: `src/features/meetings/actions/create-meeting.ts`
- Create: `src/features/meetings/actions/create-meeting.test.ts`
- Create: `src/features/meetings/ui/create-meeting-form.tsx`
- Create: `src/features/meetings/ui/create-meeting-form.test.tsx`
- Create: `src/app/meetings/new/page.tsx`

- [ ] **Step 1: Write failing action and form tests**

Cover preserved title/date input, field errors, timezone hidden value, required labels, submit pending state, and successful insert redirect contract. Mock the Supabase server boundary, not Zod internals.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/meetings/actions/create-meeting.test.ts src/features/meetings/ui/create-meeting-form.test.tsx`

Expected: FAIL with missing workflow modules.

- [ ] **Step 3: Implement the Server Action**

Authenticate with `supabase.auth.getUser()`, redirect unauthenticated users to login, validate `Object.fromEntries(formData)`, insert only `title` and `meeting_date`, select the new ID, revalidate `/meetings` and `/dashboard`, then redirect to `/meetings/{id}`. Return safe field/global errors without exposing Supabase messages.

- [ ] **Step 4: Implement the create form and route**

Use `useActionState`, labeled title and `datetime-local` inputs, and a hidden timezone offset initialized from `new Date().getTimezoneOffset()`. Announce validation errors and disable the submit command while pending.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/meetings/actions/create-meeting.test.ts src/features/meetings/ui/create-meeting-form.test.tsx`

Expected: PASS.

```bash
git add src/features/meetings/actions src/features/meetings/ui/create-meeting-form* src/app/meetings/new/page.tsx
git commit -m "feat: add create meeting workflow"
```

### Task 6: Meeting Detail And Rename

**Files:**

- Create: `src/app/meetings/[meetingId]/page.tsx`
- Create: `src/features/meetings/actions/rename-meeting.ts`
- Create: `src/features/meetings/actions/rename-meeting.test.ts`
- Create: `src/features/meetings/ui/rename-meeting-form.tsx`
- Create: `src/widgets/meetings/ui/meeting-detail.tsx`
- Create: `src/widgets/meetings/ui/meeting-detail.test.tsx`

- [ ] **Step 1: Write failing detail and rename tests**

Assert the title/date/lifecycle metadata, primary Edit/Rename hierarchy, existing-title initialization, field error behavior, and owner-hidden null result contract.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/meetings/actions/rename-meeting.test.ts src/widgets/meetings/ui/meeting-detail.test.tsx`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement detail and rename**

The route validates the UUID, calls `getMeetingById`, and calls `notFound()` for invalid, missing, or RLS-hidden IDs. Rename validates ID/title, updates only the owner-visible row, treats a missing returned row as not found, revalidates dashboard/list/detail, and returns safe form state.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/features/meetings/actions/rename-meeting.test.ts src/widgets/meetings/ui/meeting-detail.test.tsx`

Expected: PASS.

```bash
git add src/app/meetings/[meetingId]/page.tsx src/features/meetings/actions/rename-meeting* src/features/meetings/ui/rename-meeting-form.tsx src/widgets/meetings/ui/meeting-detail*
git commit -m "feat: add meeting detail and rename"
```

### Task 7: Archive, Restore, And Permanent Delete

**Files:**

- Create: `src/features/meetings/actions/archive-meeting.ts`
- Create: `src/features/meetings/actions/restore-meeting.ts`
- Create: `src/features/meetings/actions/delete-meeting.ts`
- Create: `src/features/meetings/actions/meeting-lifecycle.test.ts`
- Create: `src/features/meetings/ui/delete-meeting-dialog.tsx`
- Create: `src/features/meetings/ui/delete-meeting-dialog.test.tsx`
- Modify: `src/widgets/meetings/ui/meeting-detail.tsx`

- [ ] **Step 1: Write failing lifecycle and dialog tests**

Assert archive writes an ISO timestamp, restore writes null, delete calls permanent deletion, every action scopes by ID and owner-visible result, missing rows use not-found behavior, and the dialog requires an explicit Delete command after naming the meeting.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/meetings/actions/meeting-lifecycle.test.ts src/features/meetings/ui/delete-meeting-dialog.test.tsx`

Expected: FAIL with missing lifecycle modules.

- [ ] **Step 3: Implement lifecycle actions**

Each Server Action validates the UUID, authenticates, mutates through RLS, selects the affected ID, and hides missing/unauthorized rows with `notFound()`. Archive/restore revalidate dashboard, list, and detail. Delete redirects to `/meetings` after revalidation.

- [ ] **Step 4: Implement accessible dialog and hierarchy**

Use an actual modal dialog with focus containment, Escape/backdrop close, focus return, `aria-labelledby`, and `aria-describedby`. Keep Rename primary, Archive/Restore secondary, and Delete destructive and visually separated.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/meetings/actions src/features/meetings/ui/delete-meeting-dialog.test.tsx src/widgets/meetings/ui/meeting-detail.test.tsx`

Expected: PASS.

```bash
git add src/features/meetings/actions src/features/meetings/ui/delete-meeting-dialog* src/widgets/meetings/ui/meeting-detail.tsx
git commit -m "feat: add meeting lifecycle actions"
```

### Task 8: Route Loading, Error, Empty, And Not-Found States

**Files:**

- Create: `src/app/meetings/loading.tsx`
- Create: `src/app/meetings/error.tsx`
- Create: `src/app/meetings/[meetingId]/loading.tsx`
- Create: `src/app/meetings/[meetingId]/error.tsx`
- Create: `src/app/meetings/[meetingId]/not-found.tsx`
- Create: `src/features/meetings/ui/meeting-loading.tsx`
- Create: `src/features/meetings/ui/meeting-route-states.test.tsx`

- [ ] **Step 1: Write failing route-state tests**

Assert accessible loading status labels, geometry regions for toolbar/list/detail, retry buttons in errors, no Supabase details, and generic not-found copy that does not reveal ownership.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/meetings/ui/meeting-route-states.test.tsx`

Expected: FAIL with missing state components.

- [ ] **Step 3: Implement route boundaries and empty states**

Error boundaries must be Client Components receiving `reset`. Loading components reuse `Skeleton`. The list selects empty copy from normalized query state: no active meetings, no archived meetings, or no matching title.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/features/meetings/ui/meeting-route-states.test.tsx`

Expected: PASS.

```bash
git add src/app/meetings src/features/meetings/ui/meeting-loading.tsx src/features/meetings/ui/meeting-route-states.test.tsx
git commit -m "feat: add meeting route states"
```

### Task 9: Live Dashboard Integration

**Files:**

- Remove: `src/features/dashboard/model/dashboard-mock-data.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/features/dashboard/ui/dashboard-view.tsx`
- Modify: `src/features/dashboard/ui/dashboard-view.test.tsx`
- Modify: `src/widgets/dashboard/ui/recent-meetings.tsx`
- Modify: `src/widgets/dashboard/ui/statistic-card.tsx`
- Modify: `src/widgets/dashboard/ui/quick-actions.tsx`
- Modify: `src/widgets/dashboard/ui/welcome-banner.tsx`

- [ ] **Step 1: Rewrite dashboard tests to require live props**

Assert Total meetings, Active meetings, Archived meetings, Meetings this week, latest active records, database-empty behavior, and real `/meetings` and `/meetings/new` links. Remove assertions for time saved, action-item counts, completion rate, mock statuses, or processing queue data.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/dashboard/ui/dashboard-view.test.tsx`

Expected: FAIL because DashboardView still imports mock data.

- [ ] **Step 3: Implement query-driven dashboard**

Make `src/app/dashboard/page.tsx` await `getDashboardMeetingData()` and pass metrics/recent meetings into a pure DashboardView. Replace mock quick actions with New Meeting and View Meetings routes. Keep processing UI out until its product Sprint.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/features/dashboard src/widgets/dashboard`

Expected: PASS.

```bash
git add src/app/dashboard src/features/dashboard src/widgets/dashboard
git commit -m "feat: connect dashboard to meeting data"
```

### Task 10: Documentation, Browser QA, And Sprint Verification

**Files:**

- Create: `docs/qa/sprint-3-meeting-management-qa.md`
- Create: `docs/screenshots/sprint-3/meetings-desktop.png`
- Create: `docs/screenshots/sprint-3/meetings-tablet.png`
- Create: `docs/screenshots/sprint-3/meetings-mobile.png`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-16-sprint-3-meeting-management.md`

- [ ] **Step 1: Run the complete automated verification**

Run each command fresh:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Expected: every command exits 0 with zero lint warnings and zero test failures.

- [ ] **Step 2: Apply or validate the migration honestly**

If authenticated Supabase CLI/database credentials are available, apply the migration and exercise cross-user RLS. If they are not available, record that remote application was not performed; do not claim live RLS verification from static tests.

- [ ] **Step 3: Run browser QA**

Use a real authenticated test session and seeded owner-visible rows where available. Validate list/search/filter/sort/pagination, create, rename, archive, restore, delete confirmation, not-found behavior, dashboard refresh, and loading/error/empty states at 1440x1000, 1024x900, and 390x844.

Check keyboard focus, modal containment, Escape behavior, touch targets, contrast, text wrapping, overflow, and stable geometry. Record and fix every issue before screenshots.

- [ ] **Step 4: Update architecture and cascade documentation**

Document `features/meetings/{actions,queries,schemas,ui}`, route ownership, URL state, RLS, dashboard query integration, and the deferred delete/cascade decision for recordings, transcripts, summaries, action items, and storage objects.

- [ ] **Step 5: Review scope and create the final Sprint 3 commit**

Confirm no API routes, client-side Supabase CRUD, audio, transcript, AI, or future tables were introduced. Confirm `.env.local`, build output, and credentials are not staged.

```bash
git add README.md docs src supabase
git commit -m "feat: complete sprint 3 meeting management"
```

Stop after reporting commit hashes, changed files, migration status, architecture, test results, screenshots, responsive/accessibility notes, and deferred cascade considerations. Do not begin Sprint 4.
