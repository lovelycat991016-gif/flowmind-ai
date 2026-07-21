# Sprint 9 Signup Email OTP Verification Design

## Objective

Add six-digit Email OTP verification only after password-based signup. Login remains email plus password and continues to create the authenticated Supabase session exactly as it does today.

## Current Architecture

Server Actions validate forms and call Supabase Auth through the SSR server client. Supabase writes sessions to cookies, middleware refreshes the session and protects routes, the profile trigger provisions `profiles`, and RLS remains the final owner-isolation boundary.

## Scope Boundary

Included: request and verify OTP contracts/actions for signup email verification, a verification view, Chinese status/error copy, resend UX, and Supabase beta configuration verification.

Excluded: passwordless login, changes to `signInWithPassword`, password reset, session/middleware changes, routes restructuring, database migrations, profiles/RLS changes, and all meeting, recording, transcription, worker, and intelligence changes.

## Technical Design And Data Flow

1. A new user submits the existing email/password signup form.
2. Existing `signUp` creates the user with email confirmation enabled; Supabase sends an OTP-style confirmation email.
3. The application presents a verification view carrying the submitted email and safe internal destination.
4. The user submits six digits. A Server Action validates the token and calls `verifyOtp({ email, token, type: "signup" })`.
5. Supabase SSR writes the confirmed authenticated session cookie; the action redirects to the safe destination.
6. Existing email/password login remains `signInWithPassword`; middleware, profiles, RLS, and protected routes remain unchanged.

OTP request/resend is limited to the newly-created signup flow. It must use `signInWithOtp({ email, options: { shouldCreateUser: false } })` so verification cannot create additional accounts. The application returns generic Chinese messages and relies on Supabase for expiry and throttling.

## Security, Testing, Risk, And Rollback

Never expose whether an email exists, an OTP value, raw provider errors, cookies, or headers. Validate six ASCII digits with Zod, map expired/invalid/rate-limited provider errors safely, preserve safe `next` handling, and do not redirect on verification failure.

Test signup-to-verification actions, resend behavior, invalid/expired/rate-limited errors, session redirect after successful verification, and regression coverage for password login and middleware. Browser QA covers signup, code paste, keyboard access, resend, mobile layout, and normal password login.

Supabase must enable email confirmation/OTP templates and configure sender, expiry, and rate limits. Delayed delivery or throttling is the primary beta risk. Rollback redeploys the previous application release and restores the prior Supabase confirmation configuration; no database rollback is required.

## Acceptance Criteria

- New password signup requires a six-digit email confirmation OTP before dashboard access.
- Email/password login remains unchanged for confirmed users.
- Password reset, sessions, middleware, profiles, RLS, and product modules are unchanged.
- No signup verification path creates an account during resend or leaks account status.
