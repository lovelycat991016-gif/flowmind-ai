# Sprint 2 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Calm Workspace dashboard with a responsive application shell, reusable UI states, and local mock data only.

**Architecture:** The App Router page retains the Sprint 1 authentication boundary and renders a pure `DashboardView`. App-shell widgets own responsive navigation, dashboard widgets consume typed mock data, and shared primitives remain domain-independent.

**Tech Stack:** Next.js 15, React 19, strict TypeScript, Tailwind CSS, shadcn/ui conventions, Lucide icons, Vitest, Testing Library, and the in-app browser QA workflow.

---

### Task 1: Design Tokens and Shared UI Primitives

**Files:**

- Test: `src/shared/ui/dashboard-primitives.test.tsx`
- Modify: `src/app/globals.css`, `src/shared/ui/card.tsx`, `src/shared/ui/button.tsx`
- Create: `src/shared/ui/badge.tsx`, `src/shared/ui/skeleton.tsx`, `src/shared/ui/empty-placeholder.tsx`

- [x] Write failing semantic tests for card heading levels, badge status text, accessible empty placeholders, and hidden loading labels.
- [x] Run `npm test -- src/shared/ui/dashboard-primitives.test.tsx`; expect missing exports and heading behavior failures.
- [x] Add light/dark semantic tokens for surfaces, sidebar, metrics, statuses, shadows, and radii without introducing a theme switcher.
- [x] Extend Card with semantic title levels and footer support; add Badge, Skeleton, and EmptyPlaceholder components.
- [x] Run the targeted tests and strict type checking; expect exit code 0.

### Task 2: Responsive Application Shell

**Files:**

- Test: `src/widgets/app-shell/ui/app-shell.test.tsx`
- Create: `src/widgets/app-shell/model/navigation.ts`
- Create: `src/widgets/app-shell/ui/app-shell.tsx`, `src/widgets/app-shell/ui/app-sidebar.tsx`, `src/widgets/app-shell/ui/app-header.tsx`
- Modify: `src/features/auth/ui/sign-out-button.tsx`

- [x] Write failing tests for semantic navigation, active Dashboard state, reserved items, mobile menu names, and user identity.
- [x] Run the shell test; expect failure because the widgets do not exist.
- [x] Implement a 240-pixel desktop sidebar, 72-pixel tablet rail, mobile modal drawer, fixed header, reserved search/notification controls, and accessible user menu.
- [x] Ensure Escape/backdrop closing and focus return for the mobile drawer; keep every touch target at least 40 pixels.
- [x] Run the shell tests and complete test suite; expect all assertions to pass.

### Task 3: Typed Mock Data and Dashboard Widgets

**Files:**

- Test: `src/features/dashboard/ui/dashboard-view.test.tsx`
- Create: `src/entities/meeting/model/meeting.ts`, `src/entities/meeting/ui/meeting-status-badge.tsx`
- Create: `src/features/dashboard/model/dashboard-mock-data.ts`
- Create: `src/features/dashboard/ui/dashboard-view.tsx`
- Create: `src/widgets/dashboard/ui/welcome-banner.tsx`, `src/widgets/dashboard/ui/statistic-card.tsx`, `src/widgets/dashboard/ui/recent-meetings.tsx`, `src/widgets/dashboard/ui/quick-actions.tsx`

- [x] Write a failing dashboard contract test for the welcome heading, four statistics, four recent meetings, quick actions, statuses, and processing empty state.
- [x] Run the dashboard test; expect failure because the mock adapter and widgets do not exist.
- [x] Define read-only meeting, statistic, and quick-action contracts plus deterministic mock records.
- [x] Implement the Calm Workspace content hierarchy with no fetch calls, Supabase queries, API imports, or mutable persistence.
- [x] Run targeted and complete tests; expect all assertions to pass.

### Task 4: Page Composition and Loading State

**Files:**

- Test: `src/features/dashboard/ui/dashboard-loading.test.tsx`
- Modify: `src/app/dashboard/page.tsx`, `src/shared/lib/supabase/middleware.ts`
- Create: `src/app/dashboard/loading.tsx`, `src/features/dashboard/ui/dashboard-loading.tsx`

- [x] Write a failing loading-state test for accessible status text and geometry-matched skeleton regions.
- [x] Implement DashboardLoading using shared skeletons.
- [x] Replace the Sprint 1 placeholder with DashboardView while preserving the existing authenticated identity check.
- [x] Add a development-only `DASHBOARD_PREVIEW=true` bypass for visual QA; production behavior must remain authenticated.
- [x] Run type checking, all tests, and a production build; expect exit code 0.

### Task 5: Browser QA, Screenshots, and Documentation

**Files:**

- Create: `docs/screenshots/sprint-2/dashboard-desktop.png`, `docs/screenshots/sprint-2/dashboard-tablet.png`, `docs/screenshots/sprint-2/dashboard-mobile.png`
- Create: `docs/qa/sprint-2-dashboard-qa.md`
- Modify: `README.md`, this implementation plan

- [x] Start the local development server with placeholder public Supabase values and the development-only dashboard preview flag.
- [x] Inspect 1440x1000, 1024x900, and 390x844 viewports for overflow, overlap, alignment, hierarchy, typography, spacing, and stable component sizing.
- [x] Keyboard-test the sidebar/mobile drawer, focus indicators, user menu, reserved controls, and internal quick-action links.
- [x] Record every issue found, apply focused fixes, and repeat the affected viewport checks.
- [x] Capture final desktop, tablet, and mobile screenshots in the documented paths.
- [x] Update README structure, component inventory, design decisions, mock-data boundary, and future integration points.
- [x] Run formatting, zero-warning lint, strict type checking, all tests, production build, and `git diff --check` before committing Sprint 2 locally.
