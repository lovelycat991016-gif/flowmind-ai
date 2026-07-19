# Sprint 7 Meeting Intelligence Implementation Plan

> **For agentic workers:** Execute task-by-task with test-first checkpoints and one commit per task.

**Goal:** Produce owner-isolated summaries, action items, and decisions from completed transcripts through the existing protected worker architecture.

**Architecture:** Add a `meeting_intelligence` job type and lease-protected persistence RPCs. A server-only provider adapter performs one structured LLM call, validates it, and atomically writes derived results. Server Components read owner-scoped results for meeting detail.

## File Structure

- `supabase/migrations/202607210001_add_meeting_intelligence.sql`: tables, job-type constraint, RLS, indexes, prompt seed, completion/failure RPCs.
- `src/entities/meeting-intelligence/model/*`: domain types and presentation helpers.
- `src/features/meeting-intelligence/{schemas,queries,providers,worker,ui}/`: contracts, owner reads, adapter, execution, presentation.
- `docs/qa/sprint-7-meeting-intelligence-qa.md`: database, provider, cost, RLS, and browser QA evidence.

### Task 1: Database Contract

- [ ] Write migration contract tests for derived tables, owner RLS, job uniqueness by type, immutable prompt versions, and worker-only RPC grants.
- [ ] Confirm RED; add migration and seed prompt version `meeting_intelligence/v1`; confirm green.
- [ ] Commit: `feat: add meeting intelligence schema`

### Task 2: Domain And Response Contracts

- [ ] Add failing tests for summary/item/decision shape, source indexes, bounded text, safe codes, and prompt metadata.
- [ ] Implement Zod/domain contracts only; confirm green.
- [ ] Commit: `feat: define meeting intelligence contracts`

### Task 3: Idempotent Job Handoff

- [ ] Test that completed transcripts queue one owner-scoped intelligence job and repeated completion does not duplicate active work.
- [ ] Implement handoff through protected worker/database boundary; confirm green.
- [ ] Commit: `feat: queue meeting intelligence jobs`

### Task 4: Provider And Prompt Boundary

- [ ] Test JSON request construction, version selection, result mapping, invalid output, token limits, and safe provider errors.
- [ ] Implement provider-neutral interface and isolated model adapter; no UI calls or client secrets.
- [ ] Commit: `feat: add meeting intelligence provider`

### Task 5: Worker Execution And Atomic Persistence

- [ ] Test claim-to-completion, lease mismatch, owner validation, transient/permanent failure, and no partial persistence.
- [ ] Implement one-job execution with existing Cron/claim mechanics and completion/failure RPCs.
- [ ] Commit: `feat: execute meeting intelligence jobs`

### Task 6: Owner Reads And Meeting Detail UI

- [ ] Test RLS-hidden null behavior, all UI states, accessibility, segment evidence labels, and archived read-only display.
- [ ] Add server queries and read-only Calm Workspace section; preserve existing route boundaries.
- [ ] Commit: `feat: show meeting intelligence`

### Task 7: Verification And Documentation

- [ ] Add QA evidence for migrations, two-user RLS, prompt versions, cost limits, provider failures, and responsive browser checks.
- [ ] Run format, format check, lint, typecheck, full tests, build, and `git diff --check` sequentially.
- [ ] Commit: `feat: complete sprint 7 meeting intelligence`

## Commit Boundaries

1. `feat: add meeting intelligence schema`
2. `feat: define meeting intelligence contracts`
3. `feat: queue meeting intelligence jobs`
4. `feat: add meeting intelligence provider`
5. `feat: execute meeting intelligence jobs`
6. `feat: show meeting intelligence`
7. `feat: complete sprint 7 meeting intelligence`
