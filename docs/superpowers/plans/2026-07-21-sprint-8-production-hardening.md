# Sprint 8 Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare FlowMind for private beta with production validation, safe operational visibility, bounded AI usage tracking, first-use polish, and release operations documentation.

**Architecture:** Retain Next.js Server Components and Server Actions, Supabase RLS and Storage, and the existing service-role worker repositories. Add a server-only structured logger and a service-role-written `ai_usage_events` ledger. Keep all user-facing data reads owner-scoped and leave current worker/provider lifecycles unchanged.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Supabase PostgreSQL/RLS/Storage, Zod, Vitest, Testing Library, Tailwind, existing shadcn-compatible UI primitives, Vercel deployment logs and Cron.

---

## File Structure

- `src/shared/config/env.ts` and `src/shared/config/worker-env.ts`: public and server-only production configuration validation.
- `src/shared/observability/server.ts`: redacted structured server-event API; no browser export.
- `src/shared/observability/server.test.ts`: redaction and best-effort logging coverage.
- `supabase/migrations/202607210003_add_ai_usage_events.sql`: append-only owner-linked usage ledger and policies.
- `src/features/meeting-intelligence/usage/*`: usage domain schema, service-role writer, and tests.
- `src/features/meeting-intelligence/worker/*`: minimal usage-event recording at existing execution boundaries.
- `src/widgets/dashboard/ui/*`: non-persistent first-use onboarding panel and tests.
- `src/shared/i18n/zh-CN.ts`: typed Chinese copy needed for the onboarding/polish surface.
- `docs/qa/sprint-8-production-hardening-qa.md`: live production-security and browser QA evidence.
- `docs/beta/private-beta-runbook.md`: invitation, support, incident, rollback, and release procedures.
- `README.md`: only update beta-relevant setup or current-boundary statements if implementation makes the existing text inaccurate.

### Task 1: Production Configuration Contract

**Files:**

- Modify: `src/shared/config/env.ts`, `src/shared/config/env.test.ts`
- Modify: `src/shared/config/worker-env.ts`, `src/shared/config/worker-env.test.ts`
- Modify: `.env.example`

- [ ] Add failing tests that reject non-HTTPS production public URLs, blank worker values, and accidental server-only variables in public environment parsing.
- [ ] Run `npm test -- src/shared/config/env.test.ts src/shared/config/worker-env.test.ts` and confirm the new tests fail for the missing production rules.
- [ ] Add the smallest validation helpers necessary to distinguish local development from production, retain generic error messages, and keep `CRON_SECRET` and service-role values out of client configuration.
- [ ] Update `.env.example` with public variables only and comments identifying which values are configured in Vercel rather than committed.
- [ ] Re-run the focused configuration tests, then `npm run lint` and `npm run typecheck`.
- [ ] Commit: `chore: validate production environment configuration`

### Task 2: Production Supabase Security Verification Playbook

**Files:**

- Create: `docs/qa/sprint-8-production-hardening-qa.md`
- Create: `docs/beta/private-beta-runbook.md`
- Modify: `README.md` only if setup instructions need a beta environment clarification.

- [ ] Document exact two-user checks for Auth redirects, meeting/recording/transcript/intelligence RLS reads, permanent delete behavior, archived read-only views, and private Storage object-prefix isolation.
- [ ] Document service-role RPC checks for transcription and intelligence claim/complete/fail operations, including expected denial for an authenticated browser client.
- [ ] Document the migration-order check, Vercel environment-variable inventory, Cron authentication check, deploy health check, rollback decision, and incident escalation steps.
- [ ] Add explicit evidence fields for date, environment, verifier, result, and redacted failure reference; do not record credentials, transcript text, or customer data.
- [ ] Review the README against the implementation and add only missing production/beta boundary statements.
- [ ] Run `npm run format:check` and `git diff --check`.
- [ ] Commit: `docs: add private beta security runbook`

### Task 3: Redacted Server Observability Foundation

**Files:**

- Create: `src/shared/observability/server.ts`
- Create: `src/shared/observability/server.test.ts`
- Modify: existing server-side meeting, recording, transcription, and intelligence error boundaries only where an existing generic error is already produced.

- [ ] Write failing unit tests for a structured event containing correlation ID, category, operation, outcome, safe IDs, duration, and safe failure code.
- [ ] Add tests proving transcript text, audio paths, signed URLs, cookies, authorization headers, known secret names, and arbitrary nested error data are excluded from serialized log output.
- [ ] Implement the server-only helper with a fixed category union, allowlisted context fields, generated correlation ID, and a best-effort JSON log sink.
- [ ] Wrap existing catch/error paths with the helper while preserving current generic errors, return types, and not-found behavior; do not add client telemetry.
- [ ] Run focused observability and affected query/action/worker tests, `npm run lint`, and `npm run typecheck`.
- [ ] Commit: `feat: add redacted server observability`

### Task 4: AI Usage Ledger Database Contract

**Files:**

- Create: `supabase/migrations/202607210003_add_ai_usage_events.sql`
- Create: `src/features/meeting-intelligence/usage/ai-usage-migration.test.ts`
- Create: `src/features/meeting-intelligence/usage/ai-usage-input.ts`
- Create: `src/features/meeting-intelligence/usage/ai-usage-input.test.ts`

- [ ] Write failing migration tests for the append-only `ai_usage_events` table, ownership foreign keys, positive attempt constraint, nullable non-negative usage fields, `(meeting_intelligence_id, attempt_number)` idempotency index, owner-only `SELECT`, client mutation denial, and service-role writer boundary.
- [ ] Write failing Zod tests for bounded provider/model identifiers, completed/failed outcomes, safe failure codes, and absent provider usage values.
- [ ] Add the migration and schemas without modifying `meeting_intelligence`, `processing_jobs`, transcript tables, or their existing policies.
- [ ] Run focused ledger migration/schema tests, `npm run lint`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit: `feat: add AI usage ledger contract`

### Task 5: Best-Effort Intelligence Usage Recording

**Files:**

- Create: `src/features/meeting-intelligence/usage/ai-usage-repository.ts`
- Create: `src/features/meeting-intelligence/usage/ai-usage-repository.test.ts`
- Modify: `src/features/meeting-intelligence/providers/meeting-intelligence-provider.ts`
- Modify: `src/features/meeting-intelligence/providers/structured-meeting-intelligence-provider.ts`
- Modify: `src/features/meeting-intelligence/worker/execute-meeting-intelligence.ts`
- Modify: related provider and worker tests.

- [ ] Write failing tests that map optional provider usage into a completed ledger event, map safe provider failures into a failed ledger event, reject duplicate attempt writes, and prove a ledger-write failure does not change completed/failed intelligence workflow results.
- [ ] Extend the provider-neutral result/error contracts with optional normalized usage only; do not add a provider SDK, credentials, or live transport.
- [ ] Implement a service-role repository that verifies the intelligence owner and uses the unique attempt key for idempotent insert behavior.
- [ ] Record usage from the existing worker after provider execution with only safe metadata and attempt number. Keep the main completion/failure persistence path authoritative if ledger insertion fails.
- [ ] Run focused provider, worker, and usage tests, `npm run lint`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit: `feat: record meeting intelligence usage`

### Task 6: First-Use UX And Accessibility Polish

**Files:**

- Create: `src/widgets/dashboard/ui/beta-onboarding.tsx`
- Create: `src/widgets/dashboard/ui/beta-onboarding.test.tsx`
- Modify: `src/widgets/dashboard/ui/recent-meetings.tsx` or the existing dashboard composition point
- Modify: `src/shared/i18n/zh-CN.ts`, `src/shared/i18n/i18n.test.ts`
- Modify: only existing empty/error presentation components where a documented first-use ambiguity remains.

- [ ] Write failing component tests that show onboarding only for an empty meeting list, expose a semantic heading and ordered guidance, provide keyboard-accessible links to create a meeting, and hide the panel when at least one meeting exists.
- [ ] Add typed Chinese strings describing the supported flow: create meeting, upload audio, wait for processing, then review transcript and intelligence.
- [ ] Implement the non-persistent panel with existing Card/EmptyPlaceholder/Button primitives, no modal, no local storage, no database table, and no analytics call.
- [ ] Verify keyboard focus, `role="status"` behavior where applicable, text wrapping, and desktop/tablet/mobile layout with browser QA.
- [ ] Run focused dashboard/i18n tests, `npm run lint`, and `npm run typecheck`.
- [ ] Commit: `feat: polish private beta onboarding`

### Task 7: Release Verification And Beta Sign-off

**Files:**

- Modify: `docs/qa/sprint-8-production-hardening-qa.md`
- Modify: `docs/beta/private-beta-runbook.md`
- Modify: `README.md` only if a verified final boundary needs correction.

- [ ] Complete the QA evidence for migrations, two-user RLS and Storage isolation, service-role RPC denial/allowance, redacted logging, ledger idempotency, onboarding accessibility, and browser widths.
- [ ] Record live-environment limitations separately from unit-test evidence. Do not claim a production integration passed without a verifier, date, and environment reference.
- [ ] Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` sequentially.
- [ ] Confirm `git status --short` contains only Sprint 8 work and inspect the staged diff for no architecture replacement, AI feature expansion, or unauthorized schema changes.
- [ ] Commit: `docs: complete sprint 8 private beta readiness`

## Commit Boundaries

1. `chore: validate production environment configuration`
2. `docs: add private beta security runbook`
3. `feat: add redacted server observability`
4. `feat: add AI usage ledger contract`
5. `feat: record meeting intelligence usage`
6. `feat: polish private beta onboarding`
7. `docs: complete sprint 8 private beta readiness`

## Plan Self-Review

- Security, observability, usage tracking, UX polish, and beta readiness each have an independent task and commit boundary.
- Only Task 4 adds a database table; it does not alter existing migrations, RLS relationships, worker lifecycle, or transcript behavior.
- The plan explicitly excludes a live LLM transport, external telemetry vendor, user analytics UI, billing, retries, and feature expansion.
- Each implementation task begins with a failing test and includes focused verification before the task commit; Task 7 adds the full release gate.
