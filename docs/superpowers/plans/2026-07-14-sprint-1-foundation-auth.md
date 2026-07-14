# Sprint 1 Foundation and Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a production-ready Next.js 15 foundation with Supabase email authentication, user profiles, protected routing, automated checks, and deployment documentation.

**Architecture:** Next.js App Router owns route composition and server actions. Authentication is isolated in the `features/auth` slice, Supabase adapters live in `shared/lib/supabase`, and the only application table is `public.profiles`, protected by row-level security.

**Tech Stack:** Next.js 15, React 19, TypeScript strict mode, Tailwind CSS, shadcn/ui conventions, Supabase Auth/PostgreSQL, Vitest, Testing Library, ESLint, Prettier, GitHub Actions.

---

### Task 1: Project Foundation

**Files:**

- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- Create: `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.env.example`, `components.json`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/shared/lib/utils.ts`

- [x] Define pinned major-version dependencies and scripts for development, linting, formatting, type checking, testing, and production builds.
- [x] Install dependencies with `npm install` and commit the generated lockfile with the Sprint commit.
- [x] Add the App Router root layout, global design tokens, and shadcn-compatible utility conventions.
- [x] Run `npm run typecheck`; expect exit code 0 for the empty application foundation.

### Task 2: Authentication Contracts (TDD)

**Files:**

- Test: `src/features/auth/model/auth-schema.test.ts`
- Create: `src/features/auth/model/auth-schema.ts`
- Test: `src/features/auth/model/auth-errors.test.ts`
- Create: `src/features/auth/model/auth-errors.ts`

- [x] Write tests proving valid credentials are normalized and invalid email, short password, and mismatched confirmation are rejected.
- [x] Run `npm test -- src/features/auth/model/auth-schema.test.ts`; expect failure because the contracts do not exist.
- [x] Implement the smallest Zod schemas needed to pass the tests.
- [x] Write and fail tests for safe authentication error mapping, then implement the mapper.
- [x] Run both test files; expect all assertions to pass.

### Task 3: Supabase Boundary and Route Protection (TDD)

**Files:**

- Test: `src/shared/config/env.test.ts`, `src/features/auth/model/auth-routes.test.ts`
- Create: `src/shared/config/env.ts`, `src/features/auth/model/auth-routes.ts`
- Create: `src/shared/lib/supabase/client.ts`, `src/shared/lib/supabase/server.ts`, `src/shared/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`, `src/app/auth/callback/route.ts`
- Create: `supabase/migrations/202607140001_create_profiles.sql`

- [x] Write failing tests for environment validation and redirect decisions for anonymous and authenticated users.
- [x] Implement validated environment access and pure route-policy decisions.
- [x] Add browser, server, and middleware Supabase adapters without exposing service-role credentials.
- [x] Add cookie-based session refresh, protected dashboard routing, and PKCE callback handling.
- [x] Add the `profiles` table, automatic profile provisioning trigger, update timestamp trigger, and owner-only RLS policies.
- [x] Run targeted tests and `npm run typecheck`; expect exit code 0.

### Task 4: Authentication UI and Server Actions (TDD)

**Files:**

- Test: `src/features/auth/ui/auth-form.test.tsx`
- Create: `src/features/auth/actions/auth-actions.ts`
- Create: `src/features/auth/ui/auth-form.tsx`, `src/features/auth/ui/sign-out-button.tsx`
- Create: `src/shared/ui/button.tsx`, `src/shared/ui/input.tsx`, `src/shared/ui/label.tsx`, `src/shared/ui/card.tsx`, `src/shared/ui/alert.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`
- Create: `src/app/page.tsx`, `src/app/dashboard/page.tsx`

- [x] Write a failing component test for accessible labels, submit state, and server error rendering.
- [x] Implement reusable shadcn-style primitives and the shared authentication form.
- [x] Implement sign-in, sign-up, password reset request, password update, and sign-out server actions with safe user-facing errors.
- [x] Add auth pages and a protected dashboard that displays the authenticated identity.
- [x] Run component tests and the complete unit suite; expect all tests to pass.

### Task 5: Delivery Controls and Documentation

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Create: `vitest.config.ts`, `vitest.setup.ts`

- [x] Configure CI to install from the lockfile and run formatting, linting, type checking, tests, and a production build with non-secret placeholder public environment values.
- [x] Document local setup, Supabase configuration, migration application, authentication URLs, commands, architecture, and Sprint 1 boundaries.
- [x] Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` independently; expect every command to exit 0.
- [x] Review `git diff` and confirm no secrets, generated build output, or Sprint 2 functionality is included.
- [x] Create one local Sprint commit; record GitHub push as deferred under the Product Manager's approved network-limitation exception.
