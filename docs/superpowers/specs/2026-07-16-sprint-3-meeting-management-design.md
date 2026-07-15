# Sprint 3 Meeting Management Design

## Status

Approved on 2026-07-16.

## Objective

Deliver the first complete FlowMind business workflow: authenticated users can create, view, search, sort, filter, rename, archive, restore, and permanently delete their own meetings. The dashboard replaces Sprint 2 meeting mocks with query-derived meeting data.

Sprint 3 preserves the Calm Workspace design language and uses the existing Next.js App Router, Supabase server client, PostgreSQL, and Supabase Auth boundary.

## Scope

### Included

- One `public.meetings` table and migration
- Owner-only row-level security for every CRUD operation
- Meeting list, create, and detail routes
- Rename, archive, restore, and permanent delete actions
- Title-only search
- Active or archived filtering
- Four approved sort modes
- Twenty-row server pagination with Previous and Next controls
- Dashboard recent meetings and meeting-count metrics from PostgreSQL
- Responsive loading, empty, error, not-found, and confirmation states
- Automated tests and desktop, tablet, and mobile browser QA

### Excluded

- API route handlers
- Client-side Supabase CRUD or client-side data fetching
- Infinite scrolling
- Audio upload, recordings, transcription, summaries, action items, agents, or AI processing
- Participant, duration, or processing-status user interfaces
- Dashboard-specific database tables
- Soft deletion or trash recovery

## Architecture

Reads use authenticated Server Components and the existing Supabase server client. Mutations use Server Actions. PostgreSQL and RLS remain the final authorization boundary even when application code checks the current user.

Client Components are limited to interaction that requires browser state, including the delete confirmation dialog and URL control affordances. No client component owns persistent meeting data.

### Routes

- `/dashboard` - live meeting metrics and latest four active meetings
- `/meetings` - search, lifecycle filter, sorting, and pagination
- `/meetings/new` - create form
- `/meetings/[meetingId]` - detail, rename, archive or restore, and delete

Meeting routes include `loading.tsx` and `error.tsx` boundaries. An inaccessible or missing meeting uses the Next.js not-found boundary so owner existence is never disclosed.

### Feature Structure

```text
src/
|-- app/meetings/                 # Route composition and boundaries
|-- entities/meeting/             # Meeting domain contracts and presentation
|-- features/meetings/
|   |-- actions/                  # Authenticated Server Actions
|   |-- queries/                  # Supabase server query functions
|   |-- schemas/                  # Zod input and URL-state validation
|   `-- ui/                       # Forms, controls, dialogs, and state views
`-- widgets/meetings/             # List and detail compositions
```

Shared UI primitives remain domain-independent. Dashboard components consume query-derived props rather than importing meeting query code directly.

## Database

### Table

`public.meetings` contains:

| Column              | Definition                                                            |
| ------------------- | --------------------------------------------------------------------- |
| `id`                | UUID primary key with generated default                               |
| `user_id`           | Required UUID referencing `auth.users(id)` with user deletion cascade |
| `title`             | Required trimmed text from 1 to 200 characters                        |
| `meeting_date`      | Required `timestamptz`                                                |
| `duration_seconds`  | Nullable non-negative integer reserved for a future system workflow   |
| `participant_count` | Nullable non-negative integer reserved for a future system workflow   |
| `processing_status` | Nullable text reserved for a future system workflow                   |
| `archived_at`       | Nullable `timestamptz`; null means active                             |
| `created_at`        | Required UTC `timestamptz`                                            |
| `updated_at`        | Required UTC `timestamptz` maintained by trigger                      |

The three reserved nullable columns do not appear in Sprint 3 forms, filters, sorting, metrics, or details. No transcript, recording, summary, or action-item column is added.

### Validation

PostgreSQL requires `title = btrim(title)` and a title length from 1 to 200 characters. Nullable numeric placeholders reject negative values. Zod applies the same title normalization and range before a mutation reaches Supabase, and requires a valid meeting date and time.

### Updated Timestamp

The migration reuses `public.set_updated_at()` from Sprint 1 and adds a `before update` trigger on `public.meetings`. Every rename, archive, restore, and future system update maintains `updated_at` automatically.

### Row-Level Security

RLS is enabled and enforced through four authenticated policies:

- Select rows where `auth.uid() = user_id`
- Insert rows where `auth.uid() = user_id`
- Update rows where `auth.uid() = user_id`, with the same ownership check on the new row
- Delete rows where `auth.uid() = user_id`

Authenticated users receive only the required table privileges. Anonymous table access is revoked. Server Actions never use a service-role key.

### Indexes

Partial indexes support active and archived date ordering by `(user_id, meeting_date, id)`. Equivalent partial indexes support database title ordering by `(user_id, title, id)`. A trigram GIN index supports case-insensitive title substring search without loading rows into application memory.

The row ID is the stable tie-breaker for every sort mode. Ascending and descending scans share the same B-tree indexes.

## Meeting List Contract

The list is controlled by URL search parameters:

| Parameter | Values                                             | Default     |
| --------- | -------------------------------------------------- | ----------- |
| `q`       | Trimmed title search text                          | Empty       |
| `filter`  | `active`, `archived`                               | `active`    |
| `sort`    | `date-desc`, `date-asc`, `title-asc`, `title-desc` | `date-desc` |
| `page`    | Positive integer                                   | `1`         |

Unknown values normalize to defaults. Search, filter, and sort changes reset the page to 1. Previous and Next links preserve all other normalized state.

The server query uses an indexed PostgreSQL filter and requests 21 rows at the current offset. The first 20 render; row 21 determines whether Next is available. No query loads all matching meetings.

The default view shows active meetings with newest meeting dates first. Archived meetings are excluded until the archived filter is selected. Search matches titles case-insensitively and does not search transcripts or other future content.

## Business Workflows

### Create

The user enters a required title and meeting date/time. The Server Action validates both values, inserts an owner-scoped active meeting, and redirects to its detail page.

### Detail And Rename

The detail route queries one owner-visible meeting. A missing row calls `notFound()`. The primary action is Edit/Rename; successful validation updates the title and revalidates dashboard, list, and detail routes.

### Archive And Restore

Archive is the secondary action and sets `archived_at` to the current UTC time. Archived meetings disappear from the default list and Dashboard Recent Meetings, but remain included in Total and Archived metrics. Restore clears `archived_at`, providing the reversible path in the archived list and detail view.

### Permanent Delete

Delete is visually and semantically dangerous. An accessible confirmation dialog names the meeting, explains permanence, and requires an explicit Delete command. The owner-scoped Server Action permanently removes the row and redirects to the meeting list. There is no soft-delete column.

### Action Hierarchy

- Primary: Edit/Rename
- Secondary: Archive or Restore
- Danger: Permanent Delete

## Dashboard Integration

Dashboard data comes from meeting queries only. No aggregate or dashboard table is created.

The four statistic cards become:

- Total meetings
- Active meetings
- Archived meetings
- Meetings this week

Recent Meetings queries the latest four active meetings ordered by meeting date and stable ID. Empty and query-error states replace Sprint 2 assumptions about mock records. Duration, participants, action items, time saved, and completion rates are not fabricated.

## UI And Responsive Behavior

The module extends Calm Workspace rather than introducing a separate visual language. It uses restrained surfaces, compact controls, semantic status badges, consistent spacing, and clear typography.

- Desktop: table-like meeting list with aligned date, lifecycle, and action columns
- Tablet: compact list with the icon navigation rail and wrapped controls
- Mobile: stacked toolbar, card-like rows, readable metadata, and no horizontal scrolling

The list toolbar uses a search input, active/archived segmented control, sort menu, and New Meeting command. Empty states distinguish no active meetings, no archived meetings, and no matching search results.

Loading skeletons match list and detail geometry. Route error boundaries expose a concise message and retry command without leaking Supabase errors. Forms preserve user input on validation errors and announce status messages.

## Error And Authorization Handling

- Invalid form data returns field-safe messages without issuing a mutation.
- Query failures throw to the nearest route error boundary.
- Missing or unauthorized detail rows use identical not-found behavior.
- Mutation failures return a generic actionable error and never expose database details.
- Archive, restore, rename, and delete constrain both meeting ID and owner-visible rows.
- Out-of-range pages render the normalized empty page with Previous available rather than loading all rows or redirecting unpredictably.

## Testing

- Migration contract tests cover columns, constraints, timestamp trigger, indexes, grants, and all four RLS policies.
- Zod tests cover title trimming, blank and overlong titles, valid and invalid dates, and normalized action inputs.
- URL-state tests cover defaults, invalid values, four sort modes, filters, pagination, and state preservation.
- Query tests cover 21-row slicing, stable sorting, lifecycle filters, title search, empty results, and dashboard metrics.
- Component tests cover list, detail, create, rename, archive, restore, delete confirmation, loading, error, empty, and not-found-facing contracts.
- Existing authentication and dashboard tests remain green after mock removal.
- Browser QA covers desktop, tablet, and mobile list/detail workflows, keyboard behavior, dialogs, overflow, and visual hierarchy.
- Final verification runs formatting, zero-warning lint, strict type checking, the complete test suite, production build, and `git diff --check`.

Live RLS and migration execution require access to the configured Supabase project. If database credentials are unavailable locally, the migration is delivered and syntax/contracts are verified without claiming remote application.

## Future Cascading Considerations

Future recordings, transcripts, summaries, and action items will reference `meetings.id`. Before those tables or storage objects are introduced, the product must choose and document whether permanent meeting deletion should cascade, be restricted while dependent artifacts exist, or run an explicit cleanup workflow.

Sprint 3 implements only the current `auth.users -> meetings` cascade. It does not create future foreign keys, storage cleanup, transcript retention behavior, background deletion jobs, or audit retention. Those decisions must be resolved before dependent data ships so permanent delete cannot leave orphaned database rows or storage objects.

## Acceptance Criteria

- Authenticated users can manage only their own meetings through every workflow.
- Create and rename enforce matching PostgreSQL and Zod title rules.
- Meeting list search, filter, sort, and 20-row pagination run in PostgreSQL and preserve URL state.
- Archive is reversible; default lists and dashboard exclude archived rows.
- Delete is confirmed and permanent.
- Unauthorized detail access reveals only not-found behavior.
- Dashboard recent meetings and all four metrics are query-derived from `meetings`.
- Meeting routes provide responsive loading, error, empty, and accessible interaction states.
- No Sprint 4 audio, transcript, AI, or dependent-table functionality is introduced.
