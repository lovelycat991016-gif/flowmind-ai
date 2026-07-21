# Sprint 9 Signup Email OTP Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add six-digit email verification after password signup while preserving password login and all existing session/security boundaries.

**Architecture:** Existing signup creates an unconfirmed Supabase Auth user. New server actions verify a signup OTP or resend it without creating users. Existing `signInWithPassword`, SSR cookies, middleware, profiles, and RLS remain untouched.

**Tech Stack:** Next.js App Router, Supabase Auth SSR, TypeScript, Zod, React, Vitest, Testing Library, Tailwind.

## Task 1: Signup Verification Audit

**Files:** Create `docs/qa/sprint-9-signup-email-verification-qa.md`.

- [ ] Document Supabase Confirm Email/OTP template, sender, expiry, rate-limit, redirect URL, and test-account requirements.
- [ ] Document that password login is a regression gate and no database or RLS validation changes are allowed.
- [ ] Commit `docs: define signup email verification checks`.

## Task 2: OTP Contracts

**Files:** `src/features/auth/model/auth-schema.ts`, tests, error model tests, Chinese resource.

- [x] Add request and six-digit verification schemas, safe OTP errors, Chinese copy, and tests.
- [x] Commit `feat: add email otp auth contracts`.

## Task 3: Signup OTP Actions

**Files:** `src/features/auth/actions/auth-actions.ts`, action tests.

- [x] Add tested request and verification actions.
- [ ] Change the verification call to `type: "signup"`; ensure resend uses `shouldCreateUser: false`; redirect only after successful signup verification.
- [ ] Add regression tests for no user creation during resend and password login unchanged.
- [ ] Commit the correction separately as `fix: scope email otp actions to signup verification`.

## Task 4: Signup Form Handoff

**Files:** Signup page/form and tests only.

- [ ] Write failing tests proving signup preserves email and safe `next` context for verification while login keeps password input.
- [ ] Route a successful signup to the verification view; do not modify login composition.
- [ ] Commit `feat: start signup email verification flow`.

## Task 5: Verification And Resend UI

**Files:** Create signup verification form/page and tests; Chinese resource.

- [ ] Write failing tests for six-digit input, paste, keyboard access, resend, accessible status/errors, and safe email context.
- [ ] Implement verification/resend UI using existing Server Actions; persist no OTP in browser storage.
- [ ] Commit `feat: add signup email verification form`.

## Task 6: Session And Login Regression

**Files:** Auth action, route, middleware, and UI tests only.

- [ ] Test successful `verifyOtp(type: "signup")` creates the normal SSR session and safe redirect.
- [ ] Test confirmed users still log in with email/password and protected-route redirects are unchanged.
- [ ] Commit `test: cover signup verification and password login regression`.

## Task 7: Release Verification

**Files:** QA document and README if authentication instructions require correction.

- [ ] Record beta browser QA for signup, invalid/expired/resend OTP, desktop/tablet/mobile, keyboard navigation, session persistence, password login, and password reset.
- [ ] Run format, lint, typecheck, full tests, build, and `git diff --check`; confirm no database, middleware, worker, provider, or AI pipeline change.
- [ ] Commit `docs: complete sprint 9 signup verification`.

## Commit Boundaries

1. `docs: define signup email verification checks`
2. `feat: add email otp auth contracts` (completed)
3. `fix: scope email otp actions to signup verification`
4. `feat: start signup email verification flow`
5. `feat: add signup email verification form`
6. `test: cover signup verification and password login regression`
7. `docs: complete sprint 9 signup verification`
