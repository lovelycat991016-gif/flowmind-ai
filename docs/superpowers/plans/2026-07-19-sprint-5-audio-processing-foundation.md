# Sprint 5 Audio Processing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and display owner-isolated queued processing jobs for uploaded recordings without executing audio processing.

**Architecture:** Existing recording finalization remains the upload boundary. A focused Server Action validates an authenticated owner-visible uploaded recording and writes an idempotent queued job. Server Components read the owner-visible job; no worker, poller, API route, service-role client, or external processing provider is introduced.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase PostgreSQL/RLS, Supabase SSR server client, Zod, Vitest, Testing Library.

---

### Task 1: Processing Job Schema And RLS

**Files:**

- Create: `supabase/migrations/202607190002_create_processing_jobs.sql`
- Create: `src/features/processing-jobs/schemas/processing-job-migration.test.ts`

- [ ] Write failing migration-contract tests for the enum, all table columns, job/attempt constraints, active-job partial unique index, timestamp trigger, owner insert precondition through uploaded recordings, grants, and RLS policies.
- [ ] Run the focused test and confirm it fails because the migration is absent.
- [ ] Add the migration using `processing_job_status`, `processing_jobs`, the existing timestamp trigger, and owner-only RLS. Do not create worker functions, database extensions, or triggers that process recordings.
- [ ] Run focused migration tests and confirm green.
- [ ] Commit: `feat: add processing jobs schema`

### Task 2: Processing Job Domain And Lifecycle Contracts

**Files:**

- Create: `src/entities/processing-job/model/processing-job.ts`
- Create: `src/entities/processing-job/model/processing-job.test.ts`
- Create: `src/features/processing-jobs/schemas/processing-job-input.ts`
- Create: `src/features/processing-jobs/schemas/processing-job-input.test.ts`

- [ ] Write failing tests for all statuses, queued/running transitions, invalid terminal transitions, safe error-code validation, and active-status presentation.
- [ ] Run focused tests and confirm RED.
- [ ] Implement pure types, presentation helpers, queue-input UUID schema, and lifecycle validation. No execution function may be added.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: define processing job contracts`

### Task 3: Owner-Scoped Job Query And Queue Action

**Files:**

- Create: `src/features/processing-jobs/queries/get-processing-job-for-recording.ts`
- Create: `src/features/processing-jobs/queries/get-processing-job-for-recording.test.ts`
- Create: `src/features/processing-jobs/actions/queue-recording-processing.ts`
- Create: `src/features/processing-jobs/actions/queue-recording-processing.test.ts`

- [ ] Write failing query tests for owner-visible job retrieval, absent/RLS-hidden null behavior, and safe Supabase errors.
- [ ] Write failing action tests for authentication redirect, recording ownership, uploaded-only precondition, queued insert, duplicate active job idempotency, and safe error results.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the server query and Server Action using the authenticated Supabase server client. The action must create or return a queued active job and must not invoke a worker or external service.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: queue recording processing jobs`

### Task 4: Recording Finalization Queue Handoff

**Files:**

- Modify: `src/features/recordings/actions/finalize-upload.ts`
- Modify: `src/features/recordings/actions/recording-actions.test.ts`

- [ ] Write a failing finalization test requiring a job queue request only after verified recording upload transition succeeds.
- [ ] Run the focused recording action test and confirm RED.
- [ ] Invoke the queue action after successful finalization and revalidate the meeting detail route. A queue failure returns a safe error without exposing internals; it does not mark the uploaded recording failed.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: queue uploaded recordings for processing`

### Task 5: Meeting Detail Job Status

**Files:**

- Modify: `src/app/meetings/[meetingId]/page.tsx`
- Modify: `src/widgets/meetings/ui/meeting-recording-section.tsx`
- Modify: `src/widgets/meetings/ui/meeting-recording-section.test.tsx`

- [ ] Write failing UI tests for queued, running, completed, failed, and cancelled job badges, with no transcript or processing-control UI.
- [ ] Run focused tests and confirm RED.
- [ ] Query the job in the meeting detail Server Component and pass it to the recording section. Render only the compact localized badge.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: show recording processing status`

### Task 6: Sprint Verification And QA

**Files:**

- Create: `docs/qa/sprint-5-audio-processing-foundation-qa.md`
- Modify: `README.md`

- [ ] Document migration/RLS verification, queue idempotency, worker-execution deferral, and browser QA at desktop, tablet, and mobile.
- [ ] Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`.
- [ ] Confirm no worker, background runner, Whisper, transcription, external AI API, summary, action-item, or new unrelated database feature was added.
- [ ] Commit: `feat: complete sprint 5 audio processing foundation`
