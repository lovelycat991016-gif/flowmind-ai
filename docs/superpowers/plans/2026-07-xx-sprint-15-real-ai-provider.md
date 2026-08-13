# Sprint 15 Real AI Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely enable DeepSeek Chat for FlowMind private beta, choose one
1536-dimension real embedding provider, and verify failure handling, usage
events, and RAG quality without altering data ownership or job lifecycles.

**Architecture:** Keep `AIProvider` and `EmbeddingProvider` separate.
Server-only factories select adapters; callers preserve existing contracts;
asynchronous operations retain existing failed/retry states, while request-time
RAG failure returns empty context and Copilot continues with current context.

**Tech Stack:** Next.js server modules, TypeScript, Zod, Vitest, Supabase
service-role workers, existing `ai_usage_events`, pgvector, DeepSeek Chat, and
one approved embedding API.

---

## File structure

- `src/shared/config/ai-provider-env.ts`: chat-provider environment parsing.
- `src/shared/config/embedding-provider-env.ts`: independent embedding
  configuration.
- `src/features/ai-providers/providers/deepseek-provider.ts`: DeepSeek Chat.
- `src/features/ai-providers/factory/create-ai-provider.ts`: chat factory.
- `src/features/embedding-providers/providers/*`: selected real embedding
  adapter and mock test adapter.
- `src/features/embedding-providers/factory/create-embedding-provider.ts`:
  provider-neutral embedding factory.
- `src/features/meeting-intelligence/*`, `src/features/meeting-copilot/*`, and
  `src/features/meeting-knowledge/*`: existing consumers and their tests only.
- `docs/qa/sprint-15-*.md`: controlled provider and RAG release evidence.

### Task 1: Server-only provider configuration

**Boundary:** Add no provider calls and no schema changes. Define only the
configuration contracts used by later tasks.

**Files:**
- Modify: `src/shared/config/ai-provider-env.ts`
- Modify: `src/shared/config/embedding-provider-env.ts`
- Test: `src/shared/config/ai-provider-env.test.ts`
- Test: `src/shared/config/embedding-provider-env.test.ts`
- Modify: `.env.example` only when it exists and documents server variables

- [ ] Write failing tests: DeepSeek requires `DEEPSEEK_API_KEY`; real embedding
  providers require their provider secret and `EMBEDDING_MODEL`; unknown
  providers map to mock with a non-secret fallback reason.
- [ ] Run: `npm test -- src/shared/config/ai-provider-env.test.ts src/shared/config/embedding-provider-env.test.ts`.
  Confirm the tests fail for the missing parser behavior.
- [ ] Implement discriminated configuration unions. Keep `AI_PROVIDER` separate
  from `EMBEDDING_PROVIDER`; return no key to a client-facing module; use
  `deepseek-chat` only as the DeepSeek Chat default.
- [ ] Run: `npm test -- src/shared/config/ai-provider-env.test.ts src/shared/config/embedding-provider-env.test.ts`,
  `npm run lint`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit: `chore: validate real ai provider configuration`.

### Task 2: DeepSeek Chat transport hardening

**Boundary:** Change only the existing server-side DeepSeek adapter and chat
factory. Do not modify workers, routes, database, or RLS.

**Files:**
- Modify: `src/features/ai-providers/providers/deepseek-provider.ts`
- Test: `src/features/ai-providers/providers/deepseek-provider.test.ts`
- Modify: `src/features/ai-providers/factory/create-ai-provider.ts`
- Test: `src/features/ai-providers/factory/create-ai-provider.test.ts`

- [ ] Write failing adapter tests for bounded timeout, HTTP 429/408/5xx mapping,
  malformed and empty payloads, structured JSON rejection, and a transport
  request that cannot leak its key in diagnostic output.
- [ ] Run: `npm test -- src/features/ai-providers/providers/deepseek-provider.test.ts src/features/ai-providers/factory/create-ai-provider.test.ts`.
  Confirm each new failure is caused by missing adapter behavior.
- [ ] Add injected-transport timeout handling and preserve the existing safe
  error codes: `rate_limited`, `timeout`, `unavailable`, `rejected_input`,
  `malformed_output`, and `request_failed`. Never log request bodies or raw
  provider responses.
- [ ] Re-run the focused tests with no external network calls.
- [ ] Commit: `feat: harden deepseek chat provider`.

### Task 3: DeepSeek Chat consumer activation

**Boundary:** Wire the existing AI Provider factory into current Intelligence
and Copilot consumers only. Preserve all job/message states and Zod schemas.

**Files:**
- Modify only if needed: `src/features/meeting-intelligence/providers/*`
- Modify only if needed: `src/features/meeting-copilot/providers/*`
- Test: `src/features/meeting-intelligence/worker/execute-meeting-intelligence.test.ts`
- Test: `src/features/meeting-copilot/actions/send-meeting-copilot-message.test.ts`
- Test: `src/features/meeting-copilot/providers/*`

- [ ] Write failing tests proving Intelligence calls structured output before
  existing result validation, Copilot calls text output with existing RAG
  context, and raw provider errors never reach action state or persisted data.
- [ ] Run the three focused test groups and confirm red.
- [ ] Implement only the factory/adaptor mapping needed for `AI_PROVIDER=deepseek`.
  Keep queued/claim/processing/completed/failed, user-message persistence,
  safe localized Copilot errors, and prompt management unchanged.
- [ ] Re-run the focused test groups, `npm run lint`, and `npm run typecheck`.
- [ ] Commit: `feat: enable deepseek meeting ai flows`.

### Task 4: Embedding provider compatibility decision

**Boundary:** Make a documented vendor decision before implementation. Do not
add a migration, alter vector dimensions, or turn on a real provider without a
verified 1536-dimension result.

**Files:**
- Create: `docs/qa/sprint-15-embedding-provider-evaluation.md`
- Create only when selected: `src/features/embedding-providers/providers/deepseek-embedding-provider.ts`
- Create only when selected: `src/features/embedding-providers/providers/openai-embedding-provider.ts`
- Modify: `src/features/embedding-providers/factory/create-embedding-provider.ts`
- Test: `src/features/embedding-providers/providers/*.test.ts`
- Test: `src/features/embedding-providers/factory/create-embedding-provider.test.ts`

- [ ] Use synthetic text and an approved non-production credential to verify the
  official candidate contract: endpoint, model availability, authentication,
  batch limit, rate limit, latency, and exactly 1536 finite values. Record
  metadata and dimensions only, never a secret or private transcript.
- [ ] Select DeepSeek only if all compatibility checks pass; otherwise select
  OpenAI embedding with an explicit 1536-dimension model. Record the rejected
  alternative and reason in the evaluation document.
- [ ] Write failing tests: factory selects the approved adapter; valid output
  has 1536 values; provider failure uses a safe code; malformed/dimension-mismatched
  output is rejected; mock selection remains deterministic.
- [ ] Run: `npm test -- src/features/embedding-providers`. Confirm red.
- [ ] Implement exactly one selected server-only adapter with injected transport
  and `validateEmbedding`; retain Mock for local/test fallback.
- [ ] Run focused tests, `npm run lint`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit: `feat: enable production embedding provider`.

### Task 5: Preserve failure and fallback behavior

**Boundary:** Test and minimally correct existing error boundaries only. Do not
change retry counts, claim/lease logic, RLS, or add new error persistence.

**Files:**
- Test: `src/features/meeting-intelligence/worker/execute-meeting-intelligence.test.ts`
- Test: `src/features/meeting-knowledge/worker/execute-meeting-knowledge-job.test.ts`
- Test: `src/features/meeting-knowledge/queries/retrieve-meeting-context.test.ts`
- Test: `src/features/meeting-copilot/context/build-meeting-copilot-context.test.ts`

- [ ] Write failing tests for provider timeout, rate limit, malformed output,
  and repository failure. Assert safe code only; assert serialized failure data
  contains no key, transcript, prompt, or raw provider text.
- [ ] Assert Intelligence and knowledge jobs retain their existing failed/retry
  path; assert retrieval returns `[]`; assert Copilot retains current meeting
  context and message history.
- [ ] Run the four focused test files and confirm red.
- [ ] Implement boundary-local safe mapping only where the tests reveal a gap.
- [ ] Re-run focused tests and `git diff --check`.
- [ ] Commit: `test: verify ai provider failure boundaries`.

### Task 6: AI usage-event privacy and completeness

**Boundary:** Use the existing `ai_usage_events` table and RLS policy. No new
analytics UI, billing, quotas, migration, or policy change.

**Files:**
- Modify only if needed: `src/features/ai-usage/record-ai-usage-event.ts`
- Test: `src/features/ai-usage/record-ai-usage-event.test.ts`
- Test: `src/features/meeting-intelligence/worker/execute-meeting-intelligence.test.ts`
- Test: `src/features/meeting-copilot/actions/send-meeting-copilot-message.test.ts`
- Test: `src/features/ai-usage/ai-usage-events-migration.test.ts`

- [ ] Write failing success/failure tests for both features. Assert provider,
  model, outcome, safe failure code, and latency; assert serialized event rows
  lack prompts, transcripts, API keys, raw payloads, and full response content.
- [ ] Run the focused tests and confirm red.
- [ ] Make the smallest event-recording correction required while keeping writes
  best-effort and preserving owner association.
- [ ] Re-run focused tests, `npm run lint`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit: `test: verify ai usage event privacy`.

### Task 7: RAG quality and production release verification

**Boundary:** Add synthetic fixtures and documentation only. Do not add UI,
routes, schema, RLS, workers, or a public analytics surface.

**Files:**
- Create: `docs/qa/sprint-15-real-ai-provider-qa.md`
- Create: `src/features/meeting-knowledge/fixtures/rag-quality-fixture.ts`
- Test: `src/features/meeting-knowledge/queries/retrieve-meeting-context.test.ts`
- Test: `src/features/meeting-copilot/context/build-meeting-copilot-context.test.ts`
- Modify: `README.md` only if its provider-operation statement becomes wrong

- [ ] Write failing synthetic-fixture tests: relevant same-owner meetings enter
  top-k; unrelated near-match chunks do not rank ahead of known relevant chunks;
  no-match produces empty retrieval; other-user chunks are absent; Copilot
  retains current context after retrieval failure.
- [ ] Run the two focused test files and confirm red.
- [ ] Add the synthetic Chinese fixture and QA checklist covering query classes,
  source labels, grounding judgement, environment-secret verification,
  rate-limit/timeout simulation, usage-event redaction, and mock rollback.
- [ ] Run final verification: `npm run format`, `npm run format:check`,
  `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and
  `git diff --check`.
- [ ] Commit: `docs: complete sprint 15 real ai provider verification`.

## Production release gate and rollback

Before real beta traffic, verify `AI_PROVIDER=deepseek` with a server-only
secret, the explicitly selected `EMBEDDING_PROVIDER`, and a compatible
1536-dimension model. Confirm `AI_PROVIDER=mock` and `EMBEDDING_PROVIDER=mock`
restore non-network behavior. Block release if the chosen embedding model is
not 1536-dimensional, provider errors are not safely classified, a usage event
contains content or credentials, or synthetic RAG evaluation exposes
cross-owner content.
