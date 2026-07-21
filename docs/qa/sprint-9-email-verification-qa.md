# Sprint 9 Signup Email Verification QA

## Scope

This checklist validates password signup with six-digit email verification. Password login, middleware/session refresh, profiles, RLS, database schema, meetings, audio upload, transcription, and intelligence are outside this change.

Record the environment, verifier, date, pass/fail result, and a redacted incident reference for every live check. Do not record OTP values, passwords, cookies, access tokens, API keys, or customer email addresses.

## Automated Evidence

The application test suite covers signup OTP request, verification with `type: "signup"`, invalid and expired tokens, resend rate limiting, safe provider failures, password-login regression, protected dashboard redirect, safe callback redirect, and verified-session redirect behavior.

Automated tests do not prove email delivery, Supabase Auth provider settings, Vercel environment values, or deployed-session behavior.

## Authentication Flow

### Signup And Verification

1. Open `/signup` on the production URL.
2. Enter a non-production test email, a password of at least eight characters, and matching confirmation.
3. Confirm the action is labelled `发送验证码` and no password or OTP is shown after submission.
4. Confirm the browser is redirected to `/signup/verify` with the email context.
5. Enter the six-digit code delivered by Supabase. Verify the form supports keyboard entry, paste, numeric mobile keyboard, and resend.
6. Confirm successful verification creates the normal Supabase session and redirects to `/dashboard` or the validated internal `next` path.
7. Test invalid and expired codes. Confirm only safe Chinese errors are shown.

### Login Regression

1. With a confirmed existing test user, open `/login`.
2. Confirm email and password fields remain present and login uses the existing password flow.
3. Submit an invalid password and confirm the generic Chinese credential error exposes no provider detail.
4. Attempt `/dashboard` while signed out. Confirm redirect to `/login?next=%2Fdashboard`.
5. Sign in successfully and confirm the session cookie grants dashboard access.

## Supabase Production Checks

1. In Supabase Auth, enable Email provider and Confirm Email for the production project.
2. Configure the confirmation email template to deliver a six-digit OTP appropriate for the `signup` verification flow.
3. Send a signup request using a test mailbox and confirm delivery, sender identity, subject, and code format.
4. Confirm the configured OTP expiry by waiting past the provider setting; the UI must return a safe expired/invalid error.
5. Trigger resend only with a test mailbox. Confirm Supabase throttling produces the mapped safe rate-limit message.
6. Confirm Redirect URLs include `https://flowmind-ai-liard.vercel.app/auth/callback` and any required local development callback URL. Do not add wildcard production redirects unless reviewed.

## Vercel Production Checks

Target production URL: `https://flowmind-ai-liard.vercel.app`

Confirm the Production environment has these public values, without recording their secret values in this document:

| Variable                        | Required value or property                             | Result |
| ------------------------------- | ------------------------------------------------------ | ------ |
| `NEXT_PUBLIC_APP_URL`           | Exactly `https://flowmind-ai-liard.vercel.app`         |        |
| `NEXT_PUBLIC_SUPABASE_URL`      | HTTPS URL for the intended production Supabase project |        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Non-empty public anonymous key for that project        |        |

After confirming values, redeploy or verify the production deployment uses the current release. Do not set `SUPABASE_SERVICE_ROLE_KEY` or `CRON_SECRET` as `NEXT_PUBLIC_*` variables.

## Security Review

- OTP is never rendered from an action response, logged to the browser, or persisted in local/session storage.
- Invalid, expired, rate-limited, and unexpected provider failures map to safe Chinese messages; raw Supabase errors remain server-side.
- Signup verification uses `verifyOtp({ email, token, type: "signup" })`; resend uses `shouldCreateUser: false`.
- Existing password login continues through `signInWithPassword`.
- No middleware, session-refresh, RLS, profiles, or database change is introduced by Sprint 9.
- Callback and verification redirects accept only local paths; external values fall back to `/dashboard`.

## Release Evidence

| Check                                      | Environment | Verifier | Date | Result | Redacted reference |
| ------------------------------------------ | ----------- | -------- | ---- | ------ | ------------------ |
| Signup OTP delivery                        |             |          |      |        |                    |
| OTP verification and dashboard session     |             |          |      |        |                    |
| Expired OTP handling                       |             |          |      |        |                    |
| Resend and provider rate limit             |             |          |      |        |                    |
| Password login regression                  |             |          |      |        |                    |
| Protected dashboard redirect               |             |          |      |        |                    |
| Supabase Email/Confirm Email configuration |             |          |      |        |                    |
| Vercel public environment inventory        |             |          |      |        |                    |

## Known Limitations

- Email deliverability, rate limits, expiry, and sender reputation are provider-managed and need live beta verification.
- OTP verification does not provide MFA or device trust.
- This sprint does not add account recovery beyond the existing password reset flow.
- A deployed browser/session test is required before inviting beta users; local unit tests cannot validate the production email provider.
