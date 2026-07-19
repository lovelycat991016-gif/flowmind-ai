# Private Beta Runbook

## Purpose

Use this runbook to prepare, invite, support, and, when necessary, pause the FlowMind private beta. It applies the existing application and Supabase security model without introducing support tooling, billing, or additional product features.

## Pre-Invitation Gate

1. Deploy the intended `main` commit to the beta Vercel project.
2. Confirm production public configuration uses HTTPS and that Supabase Auth site and callback URLs match the beta domain.
3. Confirm `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are Vercel server-only values and are not available to browser code.
4. Complete every row in `docs/qa/sprint-8-production-hardening-qa.md` with environment, verifier, date, result, and redacted reference.
5. Run the repository release gate: formatting, lint, strict type check, full tests, production build, and `git diff --check`.
6. Confirm the recordings bucket is private and the two-user Storage/RLS checks passed.

Do not invite users if any required migration is missing, an owner-isolation check fails, a worker credential is exposed, or the protected Cron boundary cannot be verified.

## Invitation And Onboarding

1. Invite a small, named cohort with verified work email addresses.
2. Tell participants that supported uploads are MP3, MP4, WAV, and WebM audio up to 500 MB.
3. Explain the expected beta workflow: create a meeting, upload a recording, wait for processing, then review the transcript and meeting intelligence.
4. State that transcript and intelligence generation can fail safely and are not an archive, export, chat, or collaboration service.
5. Provide the designated support contact and the beta environment URL through the approved private channel.

## Support Triage

1. Capture the user ID, meeting ID, approximate time, browser version, and safe visible error text through the private support channel.
2. Never request a password, session cookie, bearer token, signed URL, audio file through an unapproved channel, transcript content, or service-role key.
3. Check Vercel logs using a redacted correlation or deployment reference. Do not copy raw provider, database, or Storage errors into user-facing communication.
4. Determine whether the issue is authentication, ownership/RLS, upload, worker authorization, provider availability, or a user-interface state.
5. Give users only the existing safe recovery action, such as retrying an upload or refreshing a processing state. Do not manually bypass RLS or run worker RPCs with user-supplied identifiers.

## Incident

Treat the following as a beta incident: suspected data exposure, cross-user record visibility, public Storage access, service-role or Cron secret exposure, failed migrations, unauthorized worker execution, or widespread processing failure.

1. Pause new invitations and disable the affected beta workflow if exposure is plausible.
2. Preserve deployment, Supabase audit, and Vercel log references without copying sensitive payloads into tickets.
3. Notify the technical lead and product owner with environment, time window, impact estimate, and redacted evidence.
4. Rotate a suspected `CRON_SECRET`, service-role key, or provider key in the relevant provider console and Vercel immediately.
5. Re-run the relevant two-user RLS, Storage, and worker authorization checks before resuming beta access.

## Rollback

1. Identify the last verified Vercel deployment and its commit hash.
2. If the incident is application-only, promote that verified deployment using the Vercel rollback workflow.
3. Do not roll back a destructive database migration manually. Stop the affected workflow, assess dependent data, and prepare a separate forward-only corrective migration.
4. Revoke or rotate credentials if rollback does not remove the security condition.
5. Document the rollback decision, verifier, time, user impact, and follow-up work in the private incident record.

## Beta Exit Criteria

- The production QA evidence table is complete and all required checks pass.
- No unresolved owner-isolation, private Storage, or credential-exposure incident exists.
- The repository release gate passes for the deployed commit.
- Product and technical owners approve the cohort size and support capacity.
