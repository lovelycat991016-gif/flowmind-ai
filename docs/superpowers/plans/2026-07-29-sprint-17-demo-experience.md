# Sprint 17 Task 4 Demo Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the unauthenticated FlowMind landing page into a trustworthy,
narrative-led AI product Demo experience without changing application behavior.

**Architecture:** Extend the presentational landing widget and existing Chinese
copy. New sections use ordinary links and static synthetic content, so the
public page does not depend on a provider, worker, database, or Demo user.

**Tech Stack:** Next.js Server Components, TypeScript, Tailwind CSS, Lucide,
Testing Library, Vitest.

---

## File Structure

- Modify: `src/shared/i18n/zh-CN.ts` for hero, value, workflow, Demo, source,
  and architecture copy.
- Modify: `src/widgets/landing/ui/landing-page.tsx` for narrative sections and
  anchor navigation using existing primitives.
- Modify: `src/widgets/landing/ui/landing-page.test.tsx` for page landmarks.
- Create: `src/widgets/landing/ui/landing-demo-experience.test.tsx` for Demo
  navigation and privacy-safe source presentation.

### Task 1: Define Copy And Page Contracts

**Files:** `src/shared/i18n/zh-CN.ts`,
`src/widgets/landing/ui/landing-page.test.tsx`, and new
`src/widgets/landing/ui/landing-demo-experience.test.tsx`.

- [ ] **Step 1: Write the failing page contract tests**

```tsx
expect(screen.getByRole("heading", { name: "让会议从记录工具变成可持续利用的知识资产。" })).toBeVisible();
expect(screen.getByRole("link", { name: "查看 Demo" })).toHaveAttribute("href", "#demo-case");
expect(screen.getByRole("navigation", { name: "Demo 导览" })).toBeVisible();
expect(screen.getByRole("link", { name: "查看来源引用" })).toHaveAttribute("href", "#demo-sources");
```

- [ ] **Step 2: Run `npm test -- src/widgets/landing/ui/landing-page.test.tsx src/widgets/landing/ui/landing-demo-experience.test.tsx`**

Expected: FAIL because the value-first hero, Demo navigation, and source
landmark do not exist.

- [ ] **Step 3: Add structured Chinese copy**

Add `value`, `demo`, and `architecture` objects under `zhCN.landing`. Use only
fictional source titles, dates, and excerpts. Do not add API keys, prompts,
transcripts, provider errors, similarity scores, or user identifiers.

- [ ] **Step 4: Re-run the focused tests**

Expected: tests remain focused on page composition; content exists through the
structured resource rather than hard-coded test strings.

### Task 2: Compose The Narrative Product Page

**Files:** `src/widgets/landing/ui/landing-page.tsx` and its tests.

- [ ] **Step 1: Build the hero and value sequence**

Replace the feature-first opening with the value statement, a `查看 Demo`
fragment link, and registration link. Follow it with a semantic three-item
value list. Use existing background/card/border tokens and Lucide icons.

- [ ] **Step 2: Add static Demo journey**

Create `#demo-case` with Meeting Intelligence preview content and a `navigation`
landmark labelled `Demo 导览`. Link to `#demo-intelligence`, `#demo-copilot`,
and `#demo-sources`; all must be ordinary fragment links.

- [ ] **Step 3: Add sources and architecture**

Create `#demo-sources` as an accessible list with synthetic source title, date,
and excerpt. Then render an ordered architecture list with exactly `AI Workflow`,
`Knowledge Pipeline`, and `Reliability Layer`. Do not render similarity values
or raw retrieval data.

- [ ] **Step 4: Run focused tests**

Run `npm test -- src/widgets/landing/ui/landing-page.test.tsx src/widgets/landing/ui/landing-demo-experience.test.tsx`.

Expected: PASS.

### Task 3: Privacy And Responsive QA

**Files:** new `landing-demo-experience.test.tsx` and `landing-page.tsx` only
when a test identifies an accessibility or responsive issue.

- [ ] **Step 1: Add the privacy regression**

```tsx
const page = render(<LandingPage />).container.textContent ?? "";
expect(page).not.toMatch(/API[_ ]?KEY|provider_timeout|similarity/i);
expect(screen.getByRole("list", { name: "来源引用" })).toBeVisible();
```

- [ ] **Step 2: Run `npm test -- src/widgets/landing/ui/landing-demo-experience.test.tsx`**

Expected: PASS with only synthetic source title, date, and excerpt content.

- [ ] **Step 3: Run responsive visual QA**

Inspect the landing route at desktop and mobile viewports. Confirm the Demo
journey is readable, anchors are present, focus indicators remain visible, and
no horizontal overflow is introduced.

### Task 4: Release Verification And Commit

- [ ] **Step 1: Run all release checks**

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and
`git diff --check`.

Expected: all commands exit successfully.

- [ ] **Step 2: Create the implementation commit**

Stage only the landing copy, component, and tests, then commit with
`feat: improve ai product demo experience`.

## Commit Boundary

One implementation commit after verification. Do not include planning documents,
migrations, generated assets, or unrelated untracked files.
