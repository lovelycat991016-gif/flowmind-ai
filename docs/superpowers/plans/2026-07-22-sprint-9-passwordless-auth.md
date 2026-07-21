# Sprint 9 Passwordless Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace password sign-in with six-digit Supabase email OTP while retaining SSR session, middleware, profiles, and RLS boundaries.

**Architecture:** Server Actions call the existing authenticated Supabase SSR client for `signInWithOtp` and `verifyOtp`. Existing middleware consumes the resulting cookie unchanged. No database or domain-feature code changes.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Supabase Auth SSR, Zod, React, Vitest, Testing Library, Tailwind.

## Task 1: Auth Contract Audit

**Files:** Modify `docs/qa/sprint-9-passwordless-auth-qa.md`; test `src/features/auth/model/auth-routes.test.ts`.

- [ ] Write a failing route test for preserving a safe `next` path from email request through verification.
- [ ] Document Supabase email OTP enablement, redirect URL, expiry, resend, rate-limit, and sender checks; do not record credentials.
- [ ] Verify the test passes and commit `docs: define passwordless auth release checks`.

## Task 2: OTP Validation Contracts

**Files:** Modify `src/features/auth/model/auth-schema.ts`; modify `src/features/auth/model/auth-schema.test.ts`; modify `src/shared/i18n/zh-CN.ts`.

- [ ] Write failing tests for a normalized email and exactly six ASCII digits.
- [ ] Add `requestOtpSchema` and `verifyOtpSchema` with safe Chinese validation messages.
- [ ] Run focused tests, lint, typecheck; commit `feat: define email otp validation`.

## Task 3: OTP Server Actions

**Files:** Modify `src/features/auth/actions/auth-actions.ts`; modify/add action tests.

- [ ] Add failing tests for OTP request, generic request success, invalid token, safe provider error, and successful verify redirect.
- [ ] Implement `requestEmailOtpAction` with `signInWithOtp` and `verifyEmailOtpAction` with `verifyOtp({ type: "email" })`; preserve safe next paths.
- [ ] Run focused tests, lint, typecheck; commit `feat: add email otp server actions`.

## Task 4: Email Request UI

**Files:** Modify `src/features/auth/ui/auth-form.tsx`; modify auth component tests; modify login page only if composition requires it.

- [ ] Write failing tests for a password-free email request form, pending state, and accessible error/status message.
- [ ] Replace login credential controls with the email request control using the new action.
- [ ] Run focused tests, lint, typecheck; commit `feat: add passwordless email request form`.

## Task 5: Six-Digit Verification UI

**Files:** Create `src/features/auth/ui/otp-verification-form.tsx`; create test; create/modify verification page without restructuring routes; modify localization.

- [ ] Write failing tests for email context, six-digit input, paste, keyboard focus, resend, and accessible status/errors.
- [ ] Implement the verification form and route composition using server actions only; do not persist the OTP.
- [ ] Run focused tests, lint, typecheck; commit `feat: add email otp verification form`.

## Task 6: Password Flow Removal And Compatibility

**Files:** Modify login/signup/forgot-password composition and tests; modify README only where authentication instructions change.

- [ ] Write failing tests that login no longer requires password credentials and authenticated redirects remain unchanged.
- [ ] Remove password-first entry points from the active login journey while preserving sign-out, callback, middleware, profiles, and protected-route behavior.
- [ ] Run auth and middleware tests, lint, typecheck; commit `feat: complete passwordless auth flow`.

## Task 7: Release Verification

**Files:** Modify `docs/qa/sprint-9-passwordless-auth-qa.md`; modify README if needed.

- [ ] Record test-account browser QA for request, verify, invalid/expired code, resend, desktop/tablet/mobile, keyboard navigation, session persistence, and sign-out.
- [ ] Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` sequentially.
- [ ] Confirm no migration, RLS, worker, transcription, intelligence, or meeting changes; commit `docs: complete sprint 9 passwordless auth verification`.

## Commit Boundaries

1. `docs: define passwordless auth release checks`
2. `feat: define email otp validation`
3. `feat: add email otp server actions`
4. `feat: add passwordless email request form`
5. `feat: add email otp verification form`
6. `feat: complete passwordless auth flow`
7. `docs: complete sprint 9 passwordless auth verification`
