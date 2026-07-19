# Sprint 4 Audio Upload Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver private, owner-isolated audio upload foundation for active meetings without audio processing.

**Architecture:** Server Components read owner-scoped recording metadata. Server Actions validate intent, enforce meeting ownership, issue a Supabase Storage SDK managed short-lived signed upload URL, finalize object verification, and transition state. A client component uploads bytes only through that signed URL and does not perform database CRUD.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase SSR and Storage, PostgreSQL RLS, Zod, Vitest, Testing Library.

---

### Task 1: Recording Schema And Private Bucket

**Files:**

- Create: `supabase/migrations/202607190001_create_recordings.sql`
- Create: `src/features/recordings/schemas/recording-migration.test.ts`

- [ ] Write migration-contract tests first for table columns, lifecycle check, 500 MB constraint, partial active-status unique index, timestamp trigger, RLS policies, Storage bucket limits, MIME allowlist, and object policies.
- [ ] Run the focused test and confirm it fails because the migration is absent.
- [ ] Add the minimal migration. It must create `recordings`, reuse `set_updated_at`, create private bucket configuration, and define owner-only table/object policies.
- [ ] Run focused migration tests and confirm green.
- [ ] Commit: `feat: add recordings storage schema`

### Task 2: Recording Domain Contracts

**Files:**

- Create: `src/entities/recording/model/recording.ts`
- Create: `src/features/recordings/schemas/recording-input.ts`
- Create: `src/features/recordings/schemas/recording-input.test.ts`

- [ ] Write failing tests for supported MIME types, 1-byte and 500-MB boundaries, rejected 500-MB-plus-one files, filename normalization, active lifecycle values, and path construction.
- [ ] Run the focused tests and confirm RED.
- [ ] Implement types, Zod schemas, file-size formatting, and deterministic path construction without client filesystem dependencies.
- [ ] Run the focused tests and confirm green.
- [ ] Commit: `feat: define recording upload contracts`

### Task 3: Owner-Scoped Recording Query

**Files:**

- Create: `src/features/recordings/queries/get-recording-for-meeting.ts`
- Create: `src/features/recordings/queries/get-recording-for-meeting.test.ts`

- [ ] Write failing query tests for active recording retrieval, owner-only selected columns, and `null` for absent/RLS-hidden rows.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the authenticated Supabase server query with no client-side database access.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: add recording query layer`

### Task 4: Upload Lifecycle Server Actions

**Files:**

- Create: `src/features/recordings/actions/recording-action-state.ts`
- Create: `src/features/recordings/actions/create-recording-upload.ts`
- Create: `src/features/recordings/actions/finalize-recording-upload.ts`
- Create: `src/features/recordings/actions/cancel-recording-upload.ts`
- Create: `src/features/recordings/actions/recording-actions.test.ts`

- [ ] Write failing action tests for login redirect, meeting ownership, 500-MB server rejection, Supabase SDK signed upload URL generation, active-recording conflict, successful finalization, cancellation, failure, and no leaked provider errors.
- [ ] Run focused tests and confirm RED.
- [ ] Implement actions using the authenticated server client. Verify expected Storage object metadata before `uploaded`; use safe Chinese errors and route revalidation.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: add recording upload lifecycle actions`

### Task 5: Accessible Upload Form

**Files:**

- Create: `src/features/recordings/ui/recording-upload-form.tsx`
- Create: `src/features/recordings/ui/recording-upload-form.test.tsx`
- Modify: `src/shared/i18n/zh-CN.ts`

- [ ] Write failing component tests for type/size rejection, intent submission, upload progress semantics, cancel, retry, disabled duplicate upload, and Chinese accessible names.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the client component. It may use the existing browser Supabase client solely for the signed binary upload; database state remains in Server Actions.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: add recording upload form`

### Task 6: Meeting Detail Composition

**Files:**

- Modify: `src/app/meetings/[meetingId]/page.tsx`
- Modify: `src/widgets/meetings/ui/meeting-detail.tsx`
- Create: `src/widgets/meetings/ui/meeting-recording-section.tsx`
- Create: `src/widgets/meetings/ui/meeting-recording-section.test.tsx`

- [ ] Write failing tests for empty, uploading, failed, cancelled, uploaded, and archived states, including no upload control for archived meetings.
- [ ] Run focused tests and confirm RED.
- [ ] Query recording metadata in the meeting route, render the focused section, and retain existing not-found behavior.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: integrate meeting recording upload`

### Task 7: Sprint Verification And QA

**Files:**

- Create: `docs/qa/sprint-4-audio-upload-qa.md`
- Modify: `README.md`

- [ ] Add browser QA evidence for desktop, tablet, and mobile upload states, keyboard navigation, and private-object access boundaries.
- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`.
- [ ] Apply or validate the migration and cross-user RLS only when configured Supabase credentials are available; otherwise document that limitation accurately.
- [ ] Confirm no Whisper, transcription, jobs, summaries, action items, AI, API routes, or service-role access were added.
- [ ] Commit: `feat: complete sprint 4 audio upload foundation`
