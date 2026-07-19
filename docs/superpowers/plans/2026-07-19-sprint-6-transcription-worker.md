# Sprint 6 Transcription Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transcribe one bounded uploaded recording asynchronously through a protected worker and persist an owner-isolated transcript without adding summaries or other AI features.

**Architecture:** Vercel Cron invokes a secret-protected internal Route Handler. That handler constructs a server-only worker using the service-role client, atomically claims one durable processing job, downloads the private recording, calls the isolated Whisper adapter, and completes the transcript/job transaction through protected PostgreSQL functions. The authenticated web app remains read-only for transcript and worker state.

**Tech Stack:** Next.js 15 App Router, Vercel Cron, TypeScript, Supabase PostgreSQL/RLS/Storage, OpenAI audio transcription API through the official SDK, Zod, Vitest, Testing Library.

---

## Proposed File Structure

- `supabase/migrations/202607200001_add_transcription_processing.sql`: transcript tables, worker scheduling columns, RLS, indexes, and protected lifecycle RPCs.
- `src/entities/transcript/model/transcript.ts`: transcript and segment domain types.
- `src/features/transcription/schemas/transcription-input.ts`: worker input, safe error-code, and transition validation.
- `src/features/transcription/worker/*`: claim, Storage read, provider boundary, retry classification, and orchestration.
- `src/features/transcription/providers/openai-whisper-provider.ts`: the only OpenAI SDK adapter.
- `src/app/api/internal/transcription-worker/route.ts`: cron-secret-protected bounded worker trigger.
- `src/features/transcription/queries/get-transcript-for-recording.ts`: future-ready owner-scoped read contract; no transcript reader UI is added in this sprint.
- `docs/qa/sprint-6-transcription-worker-qa.md`: migration, secret, retry, RLS, and browser QA evidence.

### Task 1: Transcription Migration Contract

**Files:**

- Create: `src/features/transcription/schemas/transcription-migration.test.ts`
- Create: `supabase/migrations/202607200001_add_transcription_processing.sql`

- [ ] Write failing migration-contract tests for transcript tables, segment ordering constraints, owner-only RLS, job lease/retry columns, due-job index, and worker-only RPC grants.
- [ ] Run the focused migration test and confirm RED because the migration is absent.
- [ ] Add the migration and only the SQL contract specified in the design: no transcript UI, provider calls, or worker code.
- [ ] Run focused migration tests and confirm green.
- [ ] Commit: `feat: add transcript processing schema`

### Task 2: Transcript And Worker Lifecycle Contracts

**Files:**

- Create: `src/entities/transcript/model/transcript.ts`
- Create: `src/entities/transcript/model/transcript.test.ts`
- Create: `src/features/transcription/schemas/transcription-input.ts`
- Create: `src/features/transcription/schemas/transcription-input.test.ts`
- Modify: `src/entities/processing-job/model/processing-job.ts`
- Modify: `src/features/processing-jobs/schemas/processing-job-input.ts`

- [ ] Write failing tests for transcript/segment shape, safe error codes, allowed worker transitions, retry eligibility, and provider-size boundaries.
- [ ] Run focused tests and confirm RED.
- [ ] Implement only pure types, Zod schemas, lifecycle helpers, and safe error classification.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: define transcript worker contracts`

### Task 3: Worker Database Lifecycle Client

**Files:**

- Create: `src/features/transcription/worker/processing-job-repository.ts`
- Create: `src/features/transcription/worker/processing-job-repository.test.ts`
- Create: `src/shared/config/worker-env.ts`
- Create: `src/shared/config/worker-env.test.ts`
- Create: `src/shared/lib/supabase/service-role.ts`
- Create: `src/shared/lib/supabase/service-role.test.ts`

- [ ] Write failing tests for missing worker secrets, one-job atomic claim input, lease-matched completion, safe failure scheduling, and no user-session client use.
- [ ] Run focused tests and confirm RED.
- [ ] Implement a server-only worker-environment validator, service-role factory, and repository that calls the migration RPCs. Keep them inaccessible from browser imports and Server Actions.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: add transcription worker job lifecycle`

### Task 4: Private Storage And Whisper Provider Boundary

**Files:**

- Create: `src/features/transcription/worker/recording-source.ts`
- Create: `src/features/transcription/worker/recording-source.test.ts`
- Create: `src/features/transcription/providers/transcription-provider.ts`
- Create: `src/features/transcription/providers/openai-whisper-provider.ts`
- Create: `src/features/transcription/providers/openai-whisper-provider.test.ts`

- [ ] Write failing tests for owner/job consistency, MIME and configured provider-size rejection before download, private object read, normalized provider response, and safe provider-error mapping.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the bounded Storage reader and isolated `whisper-1` adapter. Verify exact provider request limits and API fields against current official OpenAI documentation during this task; do not place SDK calls elsewhere.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: add Whisper transcription provider boundary`

### Task 5: Bounded Cron Worker Runner

**Files:**

- Create: `src/features/transcription/worker/run-transcription-job.ts`
- Create: `src/features/transcription/worker/run-transcription-job.test.ts`
- Create: `src/app/api/internal/transcription-worker/route.ts`
- Create: `src/app/api/internal/transcription-worker/route.test.ts`
- Create or modify: `vercel.json`

- [ ] Write failing tests for cron-secret rejection, empty queue success, one-job processing, completion persistence request, permanent failure, transient retry scheduling, and no raw error response.
- [ ] Run focused tests and confirm RED.
- [ ] Implement orchestration that claims at most one job per invocation, passes bounded audio to the provider, and always releases work through complete/fail RPCs. Add a protected Vercel Cron schedule only after the route tests pass.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: add asynchronous transcription worker`

### Task 6: Owner-Scoped Transcript Read Foundation And Status Regression

**Files:**

- Create: `src/features/transcription/queries/get-transcript-for-recording.ts`
- Create: `src/features/transcription/queries/get-transcript-for-recording.test.ts`
- Modify: `src/features/processing-jobs/ui/processing-status-badge.test.tsx`
- Modify: `src/widgets/meetings/ui/meeting-recording-section.test.tsx`

- [ ] Write failing tests for owner-visible transcript retrieval, missing/RLS-hidden null behavior, safe query errors, and all worker-driven status labels.
- [ ] Run focused tests and confirm RED.
- [ ] Implement owner-scoped read query only. Do not build a transcript reader UI or polling loop.
- [ ] Run focused tests and confirm green.
- [ ] Commit: `feat: add transcript query foundation`

### Task 7: Sprint Verification And QA

**Files:**

- Create: `docs/qa/sprint-6-transcription-worker-qa.md`
- Modify: `README.md`

- [ ] Document migration/RLS verification, cron-secret verification, bounded-input behavior, Storage access, provider error classification, lease recovery, and the manual two-user QA checklist.
- [ ] Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` sequentially.
- [ ] Confirm no summary, action-item, agent, search, transcript reader UI, browser OpenAI call, or service-role key in client code was added.
- [ ] Commit: `feat: complete sprint 6 transcription worker`

## Commit Boundaries

1. `feat: add transcript processing schema`
2. `feat: define transcript worker contracts`
3. `feat: add transcription worker job lifecycle`
4. `feat: add Whisper transcription provider boundary`
5. `feat: add asynchronous transcription worker`
6. `feat: add transcript query foundation`
7. `feat: complete sprint 6 transcription worker`

## Verification Gates

- Every task begins with focused failing tests and ends with focused green tests.
- Worker/database integration tests use a dedicated Supabase test project or local Supabase instance; source-level migration tests alone do not prove RPC locking or RLS behavior.
- Before production deployment, configure Vercel server-only `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and `TRANSCRIPTION_MAX_INPUT_BYTES`; verify none are `NEXT_PUBLIC_` variables.
- Verify the chosen Vercel plan supports the configured cron frequency and route execution duration for the bounded provider limit.
