# Sprint 9 Passwordless Authentication Design

## Objective

Replace the MVP email-and-password sign-in journey with a six-digit email OTP journey: enter email, request code, verify code, then enter the existing protected dashboard session.

## Current Architecture

The application uses Supabase Auth through SSR clients. Server Actions validate forms and call Auth APIs; Supabase SSR writes the session into cookies; middleware refreshes that session and applies protected-route policy. `profiles` remains provisioned from `auth.users`, and PostgreSQL RLS remains the final owner-isolation boundary for all meeting, recording, transcript, and intelligence data.

## Boundary

Included: authenticated email entry, OTP send/verify actions, six-digit verification UI, Chinese localization, safe resend and error states, and documentation/configuration checks.

Excluded: database migrations, profiles/RLS changes, password reset, social providers, magic-link UX, MFA, new API routes, changes to meetings, recordings, transcription, workers, or intelligence.

## Technical Design

Use `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` to request an email code and `supabase.auth.verifyOtp({ email, token, type: "email" })` to establish the session. The `shouldCreateUser` setting requires an explicit product/Supabase Auth configuration decision before implementation: it permits a first-time OTP user to create the already-supported Auth user/profile path. Rate limiting is delegated to Supabase; the application returns only mapped, generic Chinese errors.

The verification page carries only the submitted email and safe internal `next` path. It has no client-side access to Supabase keys beyond the existing public client boundary and no local persistence of the OTP. The server action validates a six-digit token with Zod, invokes the existing server Supabase client, and redirects only through `getSafeInternalPath` after successful verification.

## Data Flow

1. User enters email on `/login`.
2. Server Action validates email and requests an OTP from Supabase.
3. User is routed to the verification view with email and safe next-path context.
4. User submits six digits; Server Action validates and calls `verifyOtp`.
5. Supabase SSR persists the authenticated session cookie.
6. The existing middleware and protected dashboard use that session unchanged.

## Security And Failure Handling

- Never disclose whether an email already exists; use the same confirmation copy after a successful request.
- Do not log codes, email addresses, raw Supabase errors, cookies, or headers.
- Keep Supabase email OTP expiry, resend throttling, and email-template configuration as provider controls; document and verify them in the target environment.
- Invalid, expired, replayed, or rate-limited codes map to safe Chinese messages. The server action does not redirect on failure.
- Existing sessions and sign-out behavior remain valid.

## Testing Strategy

Unit-test Zod email/token validation, safe route handling, error mapping, and OTP action calls with the existing server-client mock convention. Component-test email entry, six-digit input semantics, pending/error/resend states, keyboard behavior, and accessibility labels. Preserve middleware, RLS, session, and existing protected-route tests. Perform browser QA for desktop, tablet, mobile, keyboard navigation, code paste, and expired/resend scenarios using a non-production test account.

## Risks And Rollback

Supabase Auth must enable email OTP and provide a transactional-email sender with deliverability, expiry, and rate-limit settings appropriate for beta. Delayed email, provider throttling, and shared inboxes can block access. Before release, retain the current password screens behind a short-lived deployment rollback path; rollback means redeploying the previous release and restoring the previous Supabase email/password settings. No database rollback is required.

## Acceptance Criteria

- A user can request and verify a six-digit email OTP, receive the existing session cookie, and enter `/dashboard`.
- Invalid and expired codes are safely handled; code resend is accessible and rate-limited by Supabase.
- Password credentials are not required by the login flow.
- Existing protected routes, profiles, RLS, meetings, audio, transcription, and intelligence behavior are unchanged.
- Full formatting, lint, strict TypeScript, tests, build, and browser QA pass before release.
