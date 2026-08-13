# Sprint 16 Demo Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a repeatable local/Preview FlowMind AI Demo with synthetic
meeting data, clear RAG source behavior, Copilot streaming, and a documented
QA release gate without changing AI, security, database, or worker contracts.

**Architecture:** A guarded fixture runner seeds only a dedicated Demo user in
non-production environments and proves resulting reads through the normal
authenticated RLS boundary. Copilot presentation consumes existing retrieved
chunks; streaming is an additive server transport with the present action as a
fallback until Preview verification succeeds.

**Tech Stack:** Next.js 15, TypeScript, Vitest, Supabase Auth/RLS,
`meeting_document_chunks` vector retrieval, existing MockEmbeddingProvider,
DeepSeek server provider, and Vercel Preview.

---

## File structure

- `scripts/demo-fixtures/*`: local/Preview-only fixture manifest, guard,
  runner, and command entry point.
- `src/features/demo-fixtures/*`: typed fixture data, database adapters, and
  contract tests when application imports are needed.
- `src/features/meeting-copilot/*`: source presentation and streaming response
  boundary, retaining existing actions/providers.
- `docs/qa/sprint-16-demo-qa.md`: reproducible Demo QA walkthrough and release
  evidence checklist.
- `README.md` and deployment documentation: Preview command and environment
  boundary only when the current operation statement requires it.

### Task 1: Define synthetic fixture contracts and environment guard

**Files:**
- Create: `src/features/demo-fixtures/demo-fixture-manifest.ts`
- Create: `src/features/demo-fixtures/demo-fixture-guard.ts`
- Create: `src/features/demo-fixtures/demo-fixture-guard.test.ts`
- Create: `scripts/demo-fixtures/run-demo-fixtures.ts`
- Modify: `package.json`

- [ ] Write failing tests proving that the fixture manifest contains stable IDs,
  fixed timestamps, three Chinese meetings, expected intelligence/action/risk
  data, knowledge chunks, and State A citation expectations.
- [ ] Write failing guard tests for `seed`, `reset`, and `verify`: reject
  Production, reject a production project URL/reference, reject absent
  `DEMO_FIXTURES_ENABLED`, and reject an unscoped Demo user ID.
- [ ] Run `npm.cmd test -- src/features/demo-fixtures/demo-fixture-guard.test.ts`.
  Confirm failures identify missing manifest/guard behavior.
- [ ] Implement the manifest and a pure guard that accepts only explicit
  local/Preview configuration. Add `demo:fixtures:seed`,
  `demo:fixtures:reset`, and `demo:fixtures:verify` scripts that invoke the
  guarded runner.
- [ ] Re-run the focused test and `npm.cmd run typecheck`.
- [ ] Commit only the fixture contract, guard, tests, and scripts:
  `feat: add repeatable demo fixtures`.

### Task 2: Implement idempotent local/Preview fixture lifecycle

**Files:**
- Create: `src/features/demo-fixtures/demo-fixture-repository.ts`
- Create: `src/features/demo-fixtures/demo-fixture-runner.ts`
- Create: `src/features/demo-fixtures/demo-fixture-runner.test.ts`
- Modify: `scripts/demo-fixtures/run-demo-fixtures.ts`

- [ ] Write failing tests for `seed`: a second execution upserts the same
  meetings, transcript/segments, intelligence result, action items, risks, and
  chunks without duplicate rows; State A persists deterministic 1536-length
  mock vectors; State B leaves embeddings null.
- [ ] Write failing tests for `reset`: it removes only rows associated with the
  fixture's demo user and does not issue an unscoped delete. Write a failing
  test that `verify` reports missing expected source labels without mutation.
- [ ] Run `npm.cmd test -- src/features/demo-fixtures/demo-fixture-runner.test.ts`.
  Confirm failures are fixture lifecycle expectations, not network failures.
- [ ] Implement repository operations using a local/Preview service-role client
  only where existing grants require worker-owned writes. Ensure each inserted
  row has the manifest Demo user ID and all destructive queries scope that ID.
  Do not modify RLS, migrations, existing worker code, or provider code.
- [ ] Re-run the focused test, `npm.cmd run lint`, and `npm.cmd run typecheck`.
- [ ] Commit the runner/repository implementation and tests:
  `feat: add repeatable demo fixtures`.

### Task 3: Prove fixture owner isolation and RAG states

**Files:**
- Create: `src/features/demo-fixtures/demo-fixture-rls-verification.ts`
- Create: `src/features/demo-fixtures/demo-fixture-rls-verification.test.ts`
- Modify: `src/features/meeting-knowledge/queries/retrieve-meeting-context.test.ts`
- Modify: `src/features/meeting-copilot/context/build-meeting-copilot-context.test.ts`

- [ ] Write failing tests proving the authenticated Demo user can read its
  meetings and chunks, a second user cannot read or retrieve them, and State A
  returns the expected source meetings in rank order.
- [ ] Write failing tests proving State B returns `retrieved_chunks: []`, does
  not fabricate a source label, and still builds current-meeting Copilot
  context.
- [ ] Run the three focused test files. Confirm red before implementation.
- [ ] Implement an authenticated-user verification adapter for the fixture
  runner and only the existing retrieval/context behavior required to expose
  its source state to callers. Preserve existing RLS and retrieval RPC.
- [ ] Re-run focused tests and `git diff --check`.
- [ ] Commit verification/tests only:
  `test: verify demo fixture isolation`.

### Task 4: Add Copilot knowledge-state and source-citation UI

**Files:**
- Create: `src/features/meeting-copilot/ui/copilot-source-citations.tsx`
- Create: `src/features/meeting-copilot/ui/copilot-source-citations.test.tsx`
- Modify: `src/features/meeting-copilot/ui/meeting-copilot-section.tsx`
- Modify: `src/features/meeting-copilot/ui/meeting-copilot-section.test.tsx`
- Modify only if needed: `src/shared/i18n/*`

- [ ] Write failing UI tests for State A source rendering: meeting title/date,
  bounded excerpt, and accessible meeting-detail link from returned chunks.
- [ ] Write failing UI tests for State B: a knowledge-base-unavailable message,
  no sources list, current-meeting answer preserved, loading/error states, and
  keyboard-accessible controls.
- [ ] Run `npm.cmd test -- src/features/meeting-copilot/ui` and confirm red.
- [ ] Implement presentational components that receive typed retrieved chunks;
  never render internal IDs, vectors, or unreturned data. Keep the existing
  Copilot provider, action, RLS queries, and message persistence unchanged.
- [ ] Re-run focused tests, `npm.cmd run lint`, and `npm.cmd run typecheck`.
- [ ] Commit UI and tests:
  `feat: show copilot knowledge sources`.

### Task 5: Add streaming response transport with compatibility fallback

**Files:**
- Create: `src/features/meeting-copilot/streaming/stream-copilot-response.ts`
- Create: `src/features/meeting-copilot/streaming/stream-copilot-response.test.ts`
- Modify: `src/features/meeting-copilot/actions/send-meeting-copilot-message.ts`
- Modify: `src/features/meeting-copilot/ui/meeting-copilot-section.tsx`
- Modify: `src/features/meeting-copilot/ui/meeting-copilot-section.test.tsx`

- [ ] Write failing transport tests for ordered text chunks, abort handling,
  safe provider failure, and final-message-only persistence. Assert that no
  key, prompt, transcript, raw provider payload, or partial message is stored.
- [ ] Write failing UI tests for incremental text, disabled send while active,
  accessible status updates, completion, and fallback to the existing
  non-streaming action when streaming is unavailable.
- [ ] Run the two focused test groups and confirm red.
- [ ] Implement an additive server-only stream adapter through the existing
  provider abstraction. Preserve the current non-streaming action as fallback;
  do not alter DeepSeek configuration, AI provider internals, RLS, database
  schema, or worker lifecycle.
- [ ] Re-run focused tests, `npm.cmd run lint`, `npm.cmd run typecheck`, and
  `git diff --check`.
- [ ] Commit streaming changes and tests:
  `feat: stream meeting copilot responses`.

### Task 6: Preview deployment, scripted QA, and rollback documentation

**Files:**
- Create: `docs/qa/sprint-16-demo-qa.md`
- Modify: `README.md`
- Test: `src/shared/config/production-ai-configuration.test.ts`

- [ ] Write a failing documentation-contract test requiring the Preview-only
  fixture gate, Production rejection, Mock embedding limitation, real-provider
  RAG disclaimer, and rollback instructions.
- [ ] Run the documentation-contract test and confirm red.
- [ ] Document exact local/Preview seed, reset, verify, State A, State B,
  source-citation, streaming, RLS isolation, API-key, usage-event, and build
  checks. Include the interview walkthrough questions and expected sources.
- [ ] Add a deployment checklist that blocks release when a fixture command can
  target Production, a source comes from another owner, State B shows sources,
  or streaming lacks a non-streaming fallback.
- [ ] Run final verification:
  `npm.cmd run format`, `npm.cmd run format:check`, `npm.cmd test`,
  `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, and
  `git diff --check`.
- [ ] Commit docs, README, and contract test:
  `docs: complete sprint 16 demo release verification`.

## Release gate and rollback

Only Preview/local environments with explicit fixture opt-in may run the
runner. A successful release proves fixture repeatability, owner isolation,
State A citations, State B fallback, streaming safety, and the full build
suite. To roll back, disable fixture opt-in, redeploy the previous build, use
non-streaming Copilot, and run a scoped Preview/local reset. Never reset or
seed Production.
