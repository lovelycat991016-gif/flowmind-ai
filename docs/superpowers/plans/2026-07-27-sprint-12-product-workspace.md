# Sprint 12 Product Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe mock-backed meeting Copilot, owner-scoped action items, data-derived AI guidance, a public landing page, and basic profile settings without enabling a real AI provider.

**Architecture:** New message and task tables use the existing meeting-owner RLS pattern. Copilot is a Server Action backed by an injected deterministic mock provider, not a browser or worker call. Server Components read owner-scoped data for meeting detail, task list, dashboard, and settings; the landing page remains public.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, Supabase SSR/PostgreSQL RLS, Zod, Vitest, Testing Library, Tailwind, existing Chinese typed i18n.

---

## File Structure

- `supabase/migrations/202607270001_add_copilot_messages_and_action_items.sql`: message/task enums, tables, constraints, indexes, triggers, RLS, and grants.
- `src/entities/meeting-ai-message/model/*`: message domain types and presentation helpers.
- `src/entities/action-item/model/*`: task types, status transitions, and date helpers.
- `src/features/meeting-copilot/{schemas,providers,queries,actions,ui}/`: validated server-only mock Copilot boundary and meeting UI.
- `src/features/action-items/{schemas,queries,actions,ui}/`: owner-scoped task contracts, reads, mutations, and views.
- `src/features/dashboard/{queries,ui}/`: dashboard attention mapping and panel.
- `src/app/action-items/*`, `src/app/settings/*`: protected routes with existing app-shell layout pattern.
- `src/app/page.tsx`, `src/widgets/landing/*`: public landing composition.
- `docs/qa/sprint-12-product-workspace-qa.md`: migration, RLS, mock-provider, responsive, and release evidence.

## Task 1: Copilot Message And Action Item Database Contract

**Files:**

- Create: `supabase/migrations/202607270001_add_copilot_messages_and_action_items.sql`
- Create: `src/features/meeting-copilot/schemas/copilot-action-items-migration.test.ts`
- Modify: `src/shared/lib/supabase/production-contract.test.ts`

- [ ] Write failing migration tests that require `meeting_ai_messages`, `action_items`, role/status/origin enums, owner RLS, source check constraints, indexes, update triggers, authenticated grants, and anon revocation.
- [ ] Run `npm test -- src/features/meeting-copilot/schemas/copilot-action-items-migration.test.ts src/shared/lib/supabase/production-contract.test.ts` and confirm failure because the migration is absent.
- [ ] Add the forward migration. Use the exact owner check pattern `auth.uid() = user_id` plus an `exists` subquery for `meetings.user_id = auth.uid()`. Define source validity as manual/no source, Copilot/message source only, intelligence/intelligence source only.
- [ ] Re-run the focused migration tests; run `npm run lint`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit: `feat: add copilot messages and action items schema`.

## Task 2: Domain Contracts And Mock Provider

**Files:**

- Create: `src/entities/meeting-ai-message/model/meeting-ai-message.ts`
- Create: `src/entities/meeting-ai-message/model/meeting-ai-message.test.ts`
- Create: `src/entities/action-item/model/action-item.ts`
- Create: `src/entities/action-item/model/action-item.test.ts`
- Create: `src/features/meeting-copilot/schemas/meeting-copilot-input.ts`
- Create: `src/features/meeting-copilot/schemas/meeting-copilot-input.test.ts`
- Create: `src/features/action-items/schemas/action-item-input.ts`
- Create: `src/features/action-items/schemas/action-item-input.test.ts`
- Create: `src/features/meeting-copilot/providers/meeting-copilot-provider.ts`
- Create: `src/features/meeting-copilot/providers/deterministic-mock-meeting-copilot-provider.ts`
- Create: `src/features/meeting-copilot/providers/deterministic-mock-meeting-copilot-provider.test.ts`

- [ ] Write failing tests for a 1–4,000 character prompt, message role/provider metadata, task title/date/status/origin/source constraints, valid task transitions, and deterministic Chinese mock output with no transport call.
- [ ] Run the focused tests and confirm failure because contracts/providers do not exist.
- [ ] Implement Zod contracts and domain types. Define `MeetingCopilotProvider.generate({ meetingId, prompt, context })` and `DeterministicMockMeetingCopilotProvider`, whose output is bounded text, `{ provider: "mock", schemaVersion: "v1" }`, and does not import environment or network modules.
- [ ] Re-run focused tests; run lint, typecheck, and `git diff --check`.
- [ ] Commit: `feat: define mock copilot and action item contracts`.

## Task 3: Owner-Scoped Copilot Queries And Server Action

**Files:**

- Create: `src/features/meeting-copilot/queries/get-meeting-ai-messages.ts`
- Create: `src/features/meeting-copilot/queries/get-meeting-ai-messages.test.ts`
- Create: `src/features/meeting-copilot/actions/send-meeting-copilot-message.ts`
- Create: `src/features/meeting-copilot/actions/send-meeting-copilot-message.test.ts`
- Modify: `src/shared/i18n/zh-CN.ts`

- [ ] Write failing query tests for ordered owner messages, no row for RLS-hidden data, and safe query failure. Write failing action tests for unauthenticated redirect, meeting owner verification, archived rejection, prompt validation, persistence of both roles, mock-provider injection, and safe provider/database failure.
- [ ] Run focused tests and confirm failure because the query/action are absent.
- [ ] Implement server reads with the authenticated Supabase server client. Implement the Server Action with `getUser`, owner/archived meeting check, user-message insert, injected deterministic provider call, assistant-message insert, `revalidatePath`, and safe Chinese result state. Do not add API routes, client Supabase calls, or provider credentials.
- [ ] Re-run focused tests; run lint, typecheck, and `git diff --check`.
- [ ] Commit: `feat: add meeting copilot mock flow`.

## Task 4: Action Item Queries, Mutations, And Task UI

**Files:**

- Create: `src/features/action-items/queries/get-action-items.ts`
- Create: `src/features/action-items/queries/get-action-items.test.ts`
- Create: `src/features/action-items/actions/create-action-item.ts`
- Create: `src/features/action-items/actions/update-action-item-status.ts`
- Create: `src/features/action-items/actions/delete-action-item.ts`
- Create: action tests beside the action files
- Create: `src/features/action-items/ui/action-item-form.tsx`
- Create: `src/features/action-items/ui/action-item-list.tsx`
- Create: UI tests beside the components
- Create: `src/app/action-items/page.tsx`, `src/app/action-items/loading.tsx`, `src/app/action-items/error.tsx`
- Modify: `src/widgets/app-shell/model/navigation.ts`, `src/shared/i18n/zh-CN.ts`

- [ ] Write failing tests for URL status/due filters, owner-only task reads, safe absence, create/update/delete owner checks, archived-meeting rejection, and task lifecycle transitions. Add component tests for Chinese labels, list semantics, keyboard controls, empty/loading/error states, and no mutation controls for archived meetings.
- [ ] Run focused tests and confirm failure.
- [ ] Implement Server Component queries and Server Actions using authenticated server clients and existing meeting ownership joins. Add URL normalization with Zod, meeting task section, dedicated `/action-items` page, and navigation link. Keep task assignment as a text label; do not add team data.
- [ ] Re-run focused tests; run lint, typecheck, and `git diff --check`.
- [ ] Commit: `feat: add owner scoped action items`.

## Task 5: Meeting Detail Copilot And Task Integration

**Files:**

- Create: `src/features/meeting-copilot/ui/meeting-copilot-section.tsx`
- Create: `src/features/meeting-copilot/ui/meeting-copilot-section.test.tsx`
- Modify: `src/app/meetings/[meetingId]/page.tsx`
- Modify: `src/widgets/meetings/ui/meeting-detail.tsx`
- Modify: `src/widgets/meetings/ui/meeting-detail.test.tsx`

- [ ] Write failing route/component tests proving meeting detail loads owner messages/tasks, renders ordered accessible conversation and task sections, exposes a labeled prompt form only on active meetings, and keeps archived meetings read-only.
- [ ] Run the focused tests and confirm failure.
- [ ] Extend the Server Component with parallel owner-scoped message/task reads. Add the Copilot section and meeting task list after intelligence results, using form actions and `role=status`/`role=alert` for pending/error feedback. Preserve existing not-found, loading, recording, transcript, and intelligence behavior.
- [ ] Re-run focused tests; run lint, typecheck, and `git diff --check`.
- [ ] Commit: `feat: show meeting copilot and tasks`.

## Task 6: Explainable Dashboard Guidance, Landing, And Settings

**Files:**

- Create: `src/features/dashboard/queries/get-dashboard-attention.ts`
- Create: `src/features/dashboard/queries/get-dashboard-attention.test.ts`
- Create: `src/widgets/dashboard/ui/ai-attention-panel.tsx`
- Create: `src/widgets/dashboard/ui/ai-attention-panel.test.tsx`
- Create: `src/widgets/landing/ui/landing-page.tsx`
- Create: `src/widgets/landing/ui/landing-page.test.tsx`
- Create: `src/features/settings/actions/update-profile.ts`
- Create: `src/features/settings/actions/update-profile.test.ts`
- Create: `src/features/settings/ui/profile-settings-form.tsx`
- Create: `src/features/settings/ui/profile-settings-form.test.tsx`
- Create: `src/app/settings/page.tsx`, `src/app/settings/loading.tsx`, `src/app/settings/error.tsx`
- Modify: `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/features/dashboard/ui/dashboard-view.tsx`, `src/widgets/app-shell/model/navigation.ts`, `src/shared/i18n/zh-CN.ts`

- [ ] Write failing tests for owner-scoped dashboard counts and attention mapping, empty state, public landing CTAs/no private data, settings protected route behavior, read-only email, valid profile-name update, and Chinese accessibility labels.
- [ ] Run focused tests and confirm failure.
- [ ] Implement deterministic attention queries from persisted meeting/task/processing/intelligence states; render direct links without provider calls. Replace the root redirect with the public landing composition. Enable `/settings` navigation and update only `profiles.full_name` via an authenticated Server Action. Do not add settings columns or preference persistence.
- [ ] Re-run focused tests; run lint, typecheck, and `git diff --check`.
- [ ] Commit: `feat: add product workspace surfaces`.

## Task 7: Sprint Verification And Documentation

**Files:**

- Create: `docs/qa/sprint-12-product-workspace-qa.md`
- Modify: `README.md` only where current capability statements need updates

- [ ] Document migration ordering, two-user RLS verification for messages/tasks, mock-provider isolation, archived behavior, dashboard derivation, landing/settings checks, responsive browser QA, and deferred real-provider/task-assignment work.
- [ ] Update README with the mock-only Copilot and action-item capability; state that no OpenAI key or real AI call is required in Sprint 12.
- [ ] Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` sequentially. Record exact results before committing.
- [ ] Commit: `docs: complete sprint 12 product workspace verification`.

## Commit Boundaries

1. `feat: add copilot messages and action items schema`
2. `feat: define mock copilot and action item contracts`
3. `feat: add meeting copilot mock flow`
4. `feat: add owner scoped action items`
5. `feat: show meeting copilot and tasks`
6. `feat: add product workspace surfaces`
7. `docs: complete sprint 12 product workspace verification`

## Verification Requirements For Every Task

- Start with a focused failing test and record the expected failure.
- Run the focused suite after implementation; do not advance with a failure.
- Run `npm run lint`, `npm run typecheck`, and `git diff --check` before the task commit.
- Preserve a clean worktree between commits and do not introduce real-provider configuration or calls.
