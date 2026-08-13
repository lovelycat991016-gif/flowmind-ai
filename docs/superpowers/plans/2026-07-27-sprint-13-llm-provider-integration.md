# Sprint 13 LLM Provider Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-only, provider-neutral DeepSeek integration for meeting intelligence and Copilot while preserving the existing worker, ownership, and structured-output boundaries.

**Architecture:** Introduce validated provider configuration and a server-only factory above the existing `MeetingIntelligenceProvider` and `MeetingCopilotProvider` interfaces. The factory composes DeepSeek as the selected default, retains the existing OpenAI adapter as a reserved implementation, and selects Mock only when explicitly configured. Existing workers and Server Actions receive providers through this boundary; their database, lease, ownership, and lifecycle logic is unchanged.

**Tech Stack:** Next.js App Router, TypeScript strict mode, server-side `fetch`, Zod, Vitest, Supabase SSR/service-role clients, existing redacted observability helper.

---

## File Structure

- `src/shared/config/ai-provider-env.ts`: discriminated server-only configuration for DeepSeek, OpenAI, and Mock.
- `src/shared/config/ai-provider-env.test.ts`: environment validation and default-model coverage.
- `src/features/ai-providers/*`: provider identifier/error contracts, transport abstraction, factory, and tests.
- `src/features/meeting-intelligence/providers/deepseek-meeting-intelligence-provider.ts`: DeepSeek structured-output adapter.
- `src/features/meeting-copilot/providers/deepseek-meeting-copilot-provider.ts`: DeepSeek conversational adapter.
- `src/features/meeting-intelligence/worker/*`: dependency-composition change only; no claim/persistence lifecycle rewrite.
- `src/features/meeting-copilot/actions/*`: provider factory composition change only; no ownership/persistence rewrite.
- `docs/qa/sprint-13-llm-provider-integration-qa.md`: deployment, failure, provider-switch, and regression checks.

## Task 1: Server-Only Provider Configuration And Shared Contracts

**Files:**

- Create: `src/shared/config/ai-provider-env.ts`
- Create: `src/shared/config/ai-provider-env.test.ts`
- Create: `src/features/ai-providers/model/ai-provider.ts`
- Create: `src/features/ai-providers/model/ai-provider.test.ts`
- Modify: `.env.example` only if it exists; never add real keys

- [ ] Write failing tests for `AI_PROVIDER=deepseek`, default `DEEPSEEK_MODEL=deepseek-chat`, missing `DEEPSEEK_API_KEY`, invalid provider names, explicit `mock`, and allowlisted safe provider errors.
- [ ] Run `npm.cmd test -- src/shared/config/ai-provider-env.test.ts src/features/ai-providers/model/ai-provider.test.ts`; confirm tests fail because the modules are absent.
- [ ] Implement a discriminated Zod parser that returns `{ provider: "deepseek", apiKey, model }`, `{ provider: "openai", apiKey, model }`, or `{ provider: "mock" }`. Define `AIProviderId` and safe error classification without containing secrets or raw transport payloads.
- [ ] Confirm server-only modules import `node:process` and are never imported by client components.
- [ ] Re-run focused tests, `npm.cmd run lint`, `npm.cmd run typecheck`, and `git diff --check`.
- [ ] Commit: `feat: add server ai provider configuration`

## Task 2: DeepSeek Structured Meeting Intelligence Adapter

**Files:**

- Create: `src/features/meeting-intelligence/providers/deepseek-meeting-intelligence-provider.ts`
- Create: `src/features/meeting-intelligence/providers/deepseek-meeting-intelligence-provider.test.ts`
- Modify: `src/features/meeting-intelligence/providers/meeting-intelligence-provider.ts` only if provider id metadata is required by the contract

- [ ] Write failing tests with injected `fetch` for valid DeepSeek chat-completion JSON, invalid JSON, missing message content, invalid action-item deadline, timeout, rate limit, and unavailable response.
- [ ] Run the focused test; confirm the adapter is absent.
- [ ] Implement a server-only adapter that posts to the DeepSeek API using the configured model and explicit structured-output instruction. Map `summary`, `key_points`, `decisions`, `action_items`, and `risks` into the existing `MeetingIntelligenceResult`, then validate it with `meetingIntelligenceResultSchema`.
- [ ] Map all failures to safe provider/domain errors. Do not log or return prompt, transcript, response body, headers, or key.
- [ ] Re-run focused tests, lint, typecheck, and diff check.
- [ ] Commit: `feat: add DeepSeek meeting intelligence provider`

## Task 3: Provider Factory And Existing Intelligence Worker Composition

**Files:**

- Create: `src/features/ai-providers/factory/create-meeting-intelligence-provider.ts`
- Create: `src/features/ai-providers/factory/create-meeting-intelligence-provider.test.ts`
- Modify: `src/features/meeting-intelligence/worker/execute-meeting-intelligence.ts`
- Modify: `src/features/meeting-intelligence/worker/execute-meeting-intelligence.test.ts`

- [ ] Write failing tests proving the factory selects DeepSeek, reserves the OpenAI adapter for `AI_PROVIDER=openai`, and refuses unsupported configuration.
- [ ] Add a worker composition test proving an injected selected provider reaches existing execution/persistence boundaries while no lease, status transition, transcript repository, or result persistence contract changes.
- [ ] Run focused tests and confirm failure because the factory is absent.
- [ ] Implement the factory as a server-only composition module. Update the worker entry composition to obtain a provider through the factory while preserving dependency injection in tests.
- [ ] Verify the worker never accesses provider credentials directly and does not change `processing_jobs` or `meeting_intelligence` lifecycle code.
- [ ] Re-run focused tests, lint, typecheck, and diff check.
- [ ] Commit: `feat: select intelligence provider at runtime`

## Task 4: DeepSeek Copilot Adapter And Explicit Mock Fallback

**Files:**

- Create: `src/features/meeting-copilot/providers/deepseek-meeting-copilot-provider.ts`
- Create: `src/features/meeting-copilot/providers/deepseek-meeting-copilot-provider.test.ts`
- Create: `src/features/ai-providers/factory/create-meeting-copilot-provider.ts`
- Create: `src/features/ai-providers/factory/create-meeting-copilot-provider.test.ts`
- Modify: `src/features/meeting-copilot/providers/meeting-copilot-provider.ts`
- Modify: `src/features/meeting-copilot/actions/send-meeting-copilot-message.ts`
- Modify: `src/features/meeting-copilot/actions/send-meeting-copilot-message.test.ts`

- [ ] Write failing tests for DeepSeek text mapping, blank response, timeout, rate limit, safe error mapping, explicit Mock selection, and provider id persistence metadata.
- [ ] Add action regressions proving owner and archived checks execute before provider creation; configured provider failures return the existing safe Chinese error and do not write a fabricated assistant message.
- [ ] Run focused tests and confirm failure because the DeepSeek Copilot adapter/factory is absent.
- [ ] Implement the adapter with injected server-side transport and bounded prompt/context. Update action composition to use the factory while retaining the deterministic mock provider for `AI_PROVIDER=mock` only.
- [ ] Do not add browser API calls, keys, streaming, new routes, or database schema changes.
- [ ] Re-run focused tests, lint, typecheck, and diff check.
- [ ] Commit: `feat: add DeepSeek meeting copilot provider`

## Task 5: Deployment Documentation And Full Provider Verification

**Files:**

- Create: `docs/qa/sprint-13-llm-provider-integration-qa.md`
- Modify: `README.md` only to document provider environment setup and current provider support
- Modify: `.env.example` if present, using key names only

- [ ] Document DeepSeek configuration, `AI_PROVIDER` switching, no-client-key verification, structured-output checks, worker/Copilot failure behavior, mock-mode use, provider outage handling, and rollback to explicit Mock mode.
- [ ] Verify no migration, RLS, middleware, or worker-lifecycle file outside provider composition changed.
- [ ] Run `npm.cmd run format`, `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, and `git diff --check` sequentially.
- [ ] Commit: `docs: complete sprint 13 provider integration verification`

## Commit Boundaries

1. `feat: add server ai provider configuration`
2. `feat: add DeepSeek meeting intelligence provider`
3. `feat: select intelligence provider at runtime`
4. `feat: add DeepSeek meeting copilot provider`
5. `docs: complete sprint 13 provider integration verification`

## Verification Requirements For Every Task

- Begin with a focused failing test that fails because the planned production unit is absent or not yet wired.
- Use injected transport/mocks only; never call DeepSeek or OpenAI during tests.
- Run focused tests, ESLint, strict TypeScript, and `git diff --check` before each commit.
- Keep API keys out of commits, fixtures, logs, browser modules, and test output.
- Stop for approval before implementing Task 1.
