# Sprint 12 Product Workspace Design

## Status

Proposed. This specification and its implementation plan define Sprint 12 only. No application implementation starts until they are approved.

## Objective

Turn the current meeting-processing MVP into a more complete private-beta workspace without depending on a configured OpenAI key. Sprint 12 adds a meeting-scoped Copilot entry point backed by a deterministic mock provider, durable meeting AI messages, actionable task tracking, data-derived dashboard guidance, a public landing page, and a small account-settings surface.

## Current Architecture

FlowMind uses Next.js App Router with Server Components for reads, Server Actions for authenticated mutations, Supabase Auth SSR cookies, middleware route protection, PostgreSQL RLS, private recording Storage, and service-role cron workers for transcription and meeting intelligence. Meeting detail already displays recordings, transcripts, processing state, and owner-scoped intelligence. `profiles` already provides owner-scoped `full_name` and `avatar_url` fields.

The existing provider interfaces, cron routes, recording bucket, object paths, processing jobs, transcription pipeline, and meeting-intelligence lifecycle remain authoritative. The product currently has no persistent Copilot messages, task table, public landing page, or enabled settings route.

## Scope Boundary

### Included

- A meeting-scoped Copilot conversation entry in the meeting detail page.
- A server-only `MeetingCopilotProvider` abstraction and deterministic mock implementation. The mock returns a bounded, Chinese-language response derived from the submitted prompt without network access.
- `meeting_ai_messages` persistence for ordered user and assistant messages owned through the meeting relationship.
- `action_items` persistence, owner-scoped list/query/actions, meeting-detail task presentation, and a dedicated authenticated task view.
- Dashboard attention cards derived from existing meetings, processing state, intelligence state, and open/overdue action items. No model inference is involved.
- A public Calm Workspace landing page at `/` with login and signup calls to action.
- A protected `/settings` page that reads and updates the existing profile name only.
- Chinese localization, responsive states, accessibility coverage, QA documentation, and release verification.

### Excluded

- OpenAI calls, provider SDKs, `OPENAI_API_KEY` configuration, token/cost accounting changes, streaming, model selection, or fallback to a real provider.
- Changes to Supabase Auth, session cookies, middleware policy, profiles RLS policy, meeting RLS, recording Storage bucket/path/policy, transcription, cron worker mechanics, or meeting-intelligence lifecycle.
- New audio formats, audio upload changes, Whisper changes, transcript editing, knowledge base/RAG, team collaboration, notifications, billing, sharing, or exports.
- Automatic conversion of every Copilot message into a task. Users explicitly create or confirm tasks in Sprint 12.

## Product And UX Design

### Meeting Copilot

The meeting detail page gains a section after intelligence results. Users write a short question or request, submit it through a Server Action, and see their message plus a deterministic assistant reply. The section presents ordered messages with semantic labels, a form label, a busy status, safe validation errors, an empty state, and a note that the beta response is simulated while live AI is unavailable.

Archived meetings are read-only: historical messages remain visible, but the prompt form and task-creation controls are disabled. The assistant reply is never produced in the browser, even for the mock implementation.

`MeetingCopilotProvider` accepts a normalized request containing the meeting id, user prompt, and an allowlisted context summary. It returns a normalized response with provider id `mock`, content, and metadata. `DeterministicMockMeetingCopilotProvider` is injected by the Server Action; replacing it with a real provider later changes only the adapter composition, not UI, persistence, or RLS boundaries.

### Action Items

Action items are durable user tasks. The task list supports title, optional description, optional assignee label, optional due date, and status `open`, `in_progress`, `completed`, or `cancelled`. A task can be created manually for a meeting or from a Copilot assistant message or existing intelligence result. Its origin is explicit: `manual`, `copilot`, or `intelligence`.

The meeting detail page shows the meeting's tasks and offers create, status-change, and delete controls for active meetings. `/action-items` provides URL-driven filtering by status and due state, with owner-scoped server reads. Completed/cancelled tasks remain visible as history. No assignment to other users, notifications, or background task automation is introduced.

### Dashboard AI Guidance

The dashboard adds an "AI 工作提示" panel driven only by persisted data: open and overdue task counts, meetings awaiting recording/transcription/intelligence review, and direct links to the corresponding meeting or task view. It is an explainable, non-generative prioritization view. Empty states tell new users to create a meeting; no fake AI analysis is shown.

### Landing And Settings

`/` becomes a public Chinese landing page using the Calm Workspace language: a focused value proposition, privacy statement, three workflow steps, and links to signup/login. It contains no authenticated data and no AI claim beyond the mock-beta disclosure.

`/settings` becomes an authenticated account page inside the existing application shell. It displays the signed-in email as read-only and allows updating `profiles.full_name` using the existing owner-only profile RLS policy. Product preference persistence is deliberately deferred rather than adding speculative settings columns.

## Database Proposal

One forward migration introduces two tables and enum types. It does not modify existing tables, policies, bucket configuration, RPCs, or worker tables.

### `meeting_ai_messages`

| Column       | Design                                                                           |
| ------------ | -------------------------------------------------------------------------------- |
| `id`         | UUID primary key                                                                 |
| `meeting_id` | Required reference to `meetings`, cascade delete                                 |
| `user_id`    | Required reference to `auth.users`; must match meeting owner                     |
| `role`       | Enum: `user` or `assistant`                                                      |
| `content`    | Trimmed non-empty text, bounded to 4,000 characters                              |
| `provider`   | Nullable bounded identifier; `mock` for assistant replies, null for user prompts |
| `metadata`   | JSON object only; allowlisted values such as mock schema version                 |
| timestamps   | `created_at`, `updated_at`, existing `set_updated_at` trigger                    |

Indexes: `(user_id, meeting_id, created_at)` and `(meeting_id, created_at)`. RLS grants authenticated owners `SELECT` and `INSERT` only when the related meeting belongs to `auth.uid()`. Browser updates/deletes are not needed for Sprint 12; no anon access.

### `action_items`

| Column                        | Design                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `id`                          | UUID primary key                                                                           |
| `meeting_id`                  | Required reference to `meetings`, cascade delete                                           |
| `user_id`                     | Required reference to `auth.users`; must match meeting owner                               |
| `title` / `description`       | Required bounded title; optional bounded description                                       |
| `status`                      | Enum: `open`, `in_progress`, `completed`, `cancelled`                                      |
| `assignee_label` / `due_date` | Nullable text/date; never references another user                                          |
| `origin`                      | Enum: `manual`, `copilot`, `intelligence`                                                  |
| source references             | Nullable `source_message_id` and `source_intelligence_id`, with an origin check constraint |
| timestamps                    | `created_at`, `updated_at`, `completed_at`, existing update trigger                        |

The source constraint is exact: manual tasks have neither source; Copilot tasks have only a message source; intelligence tasks have only an intelligence source. Indexes cover `(user_id, status, due_date, created_at desc)` and `(meeting_id, created_at desc)`. Owner RLS permits select, insert, update, and delete only when the row and related meeting belong to `auth.uid()`; anonymous access is revoked.

## Data Flow

```text
Meeting detail (client form)
  -> Server Action validates prompt + authenticated meeting ownership
  -> inserts owner-scoped user message
  -> injected deterministic mock provider runs server-side
  -> inserts owner-scoped assistant message
  -> revalidates meeting detail

Meeting detail / Action Items page
  -> Server Component owner-scoped queries
  -> Server Action validates ownership + task transition
  -> action_items mutation protected by RLS

Dashboard Server Component
  -> owner-scoped meeting, processing, intelligence, and action-item queries
  -> explainable attention cards; no provider call
```

No message or task is sent to a browser Supabase client. The mock provider has no network transport, no credentials, and no access to audio, raw transcripts, Storage URLs, or service-role credentials.

## Security And Privacy

- RLS and authenticated Supabase server clients remain the final user-data boundary. Every query and Server Action also scopes to the current user and related meeting.
- Missing or inaccessible meeting, message, and task data behaves as absent; meeting detail preserves its existing non-disclosing not-found behavior.
- The provider receives only validated prompt data and optional allowlisted meeting title/context. It never receives recordings, signed URLs, raw provider errors, secrets, profile data, or unrestricted transcript content.
- Server Actions expose Chinese safe errors only. Internal database/provider errors are logged through the existing redacted observability helper where appropriate.
- The new migration grants only the minimum authenticated table permissions required by its RLS policies and revokes anonymous access.

## Testing Strategy

- Migration contract tests first: enum values, ownership policies, source checks, indexes, triggers, grants, and anonymous denial.
- Domain/schema tests first for message bounds, task origin/source validity, lifecycle transitions, due dates, and safe errors.
- Server Action tests use mocked authenticated Supabase clients and mock provider injection to cover owner access, archived rejection, malformed input, safe failures, and no network/provider secret exposure.
- Query tests cover owner results, RLS-hidden null, URL filters, malformed metadata, and dashboard attention mapping.
- UI tests cover Chinese copy, loading/error/empty states, keyboard form use, semantic message log/list markup, labels, status announcements, and archived read-only behavior.
- Landing tests confirm public CTAs and absence of private data. Settings tests confirm owner profile update and read-only email.
- Final verification runs Prettier, `format:check`, ESLint, strict TypeScript, full Vitest suite, production build, `git diff --check`, and desktop/tablet/mobile browser QA.

## Acceptance Criteria

- A signed-in owner can send a meeting Copilot prompt and see persisted user/assistant messages; the server-only deterministic mock is the only provider used.
- Cross-user and archived-meeting mutations are rejected without information leakage.
- `meeting_ai_messages` and `action_items` have validated owner RLS, indexes, triggers, and migration-contract coverage.
- Owners can create, view, update task status, and delete their own action items; source linkage validates correctly.
- Dashboard guidance is based only on existing persisted states and action items, remains owner-scoped, and does not call a provider.
- `/` is a responsive public landing page; `/settings` is protected and safely edits only the owner profile name.
- No real AI API call, OpenAI key, Storage/RLS/auth/worker architecture change, or out-of-scope product feature is introduced.

## Risks And Deferred Work

- Mock responses are deliberately not meeting-grounded intelligence; UI must disclose this so beta users do not mistake them for analysis.
- Message retention, deletion, pagination, streaming, citations, real provider integration, and rate limiting require a separately approved sprint.
- Tasks have assignee labels rather than multi-user assignment. Team workspaces, reminders, notifications, and calendar integrations remain deferred.
- Dashboard attention is a deterministic view, not predictive AI. Personalization and recommendation ranking are deferred.
- If a real provider is enabled later, it requires an independent security/cost review, model-output validation, prompt/version management, and an explicit feature flag.
