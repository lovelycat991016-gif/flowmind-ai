# Sprint 5 Audio Processing Foundation QA

## Automated Verification

Sprint 5 adds durable processing-job persistence, lifecycle contracts, owner-scoped reads, recording-finalization handoff, and status-only meeting-detail UI. The Task 6 handoff runs Prettier, ESLint, strict TypeScript, the complete Vitest suite, production build, and Git whitespace verification.

## Processing Job Schema

- `supabase/migrations/202607190002_create_processing_jobs.sql` defines the `public.processing_job_status` enum: `queued`, `running`, `completed`, `failed`, and `cancelled`.
- `public.processing_jobs` references the recording and owner. The meeting relationship is intentionally derived through `recordings.meeting_id`; no redundant `meeting_id` column exists on jobs.
- The table constrains job type, attempts, and attempt limits. Its partial unique index permits only one active `queued` or `running` job per recording while retaining terminal job history.
- The existing `public.set_updated_at()` trigger maintains `updated_at`.
- Migration contract tests cover the enum, columns, constraints, active-job index, trigger, grants, and RLS policy contract.

## Lifecycle And Recording Handoff

- The current domain transition contract accepts `queued -> running`, `queued -> cancelled`, `running -> completed`, and `running -> failed`.
- Sprint 5 creates only `queued` jobs. The remaining persisted statuses exist for future worker compatibility and current status-display coverage; Sprint 5 does not execute transitions.
- After Storage object verification, `finalizeUpload` transitions an owner-visible recording to `uploaded`, then creates a queued processing job with `attempt_count = 0`.
- A repeated finalization reads an existing active job rather than creating another one. The database partial unique index remains the concurrent-request backstop.
- A job insertion failure returns the existing safe upload error and does not expose database details. The recording remains uploaded, allowing the idempotent finalization path to retry the handoff later.

## Ownership Boundaries

- The authenticated Supabase server client is used for reads and mutations; no web application service-role key is used.
- `processing_jobs` RLS permits owner-only reads and permits inserts only for the authenticated owner of an uploaded recording.
- The finalization workflow checks the authenticated user, recording ownership, and related meeting ownership through `recordings -> meetings` before queueing work.
- `getProcessingJobForRecording` relies on RLS and returns `null` for missing or cross-user hidden jobs. Supabase errors become a fixed safe query error.
- Live two-user RLS verification remains pending a configured Supabase test project. The delivered migration and automated contracts are not evidence that a remote migration has been applied.

## Processing Status UI

- Meeting detail loads processing data only when an owner-visible recording exists.
- The recording section renders a semantic text status for `queued`, `running`, `completed`, `failed`, and `cancelled`; the badge uses `role="status"` and does not rely on color alone.
- Existing recording upload states remain unchanged. Archived meetings show an existing status but do not show a new-upload control.
- Existing meeting-detail `loading.tsx` and `error.tsx` boundaries continue to cover query loading and safe query failures.

## Browser QA Limitation

Component and route tests validate status copy, semantic accessibility, absent-recording behavior, and archived read-only behavior. Interactive browser QA could not be completed in this workspace because the local development server could not remain bound to port `3000`: the current Windows shell environment contains duplicate `PATH` entries that prevent persistent background launch. Production build completed successfully.

The following remains for an authenticated local or deployed environment at desktop `1440x1000`, tablet `1024x900`, and mobile `390x844`:

- Verify each processing badge fits the recording section without overlap or horizontal scrolling.
- Verify keyboard and screen-reader announcement of the status text.
- Confirm a second authenticated user cannot see the first user's recording or processing status.
- Confirm archived meetings show existing processing status but have no upload control.

## Deferred Decisions

- No worker, queue consumer, scheduler, lease claimant, retry executor, or background execution infrastructure exists in Sprint 5.
- Whisper, transcription, summaries, action items, AI APIs, and derived meeting content are deferred.
- A future worker requires separately approved non-user authorization, atomic claims, lease recovery, safe error-code handling, and idempotent processing before it may consume queued jobs.
