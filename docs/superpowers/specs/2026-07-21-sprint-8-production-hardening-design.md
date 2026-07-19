# Sprint 8 Production Hardening Design

## Status

Proposed. Implementation begins only after approval of this specification and plan.

## Objective

Prepare the FlowMind MVP for a controlled private beta by validating production boundaries, improving safe operational visibility, recording bounded AI-usage data, removing avoidable onboarding friction, and documenting release operations.

## Scope Boundary

### Included

- Explicit production environment and deployment-readiness validation for the existing Next.js, Supabase, Storage, Cron, and service-role boundaries.
- A repeatable two-user Supabase production-security verification playbook for existing RLS policies, private Storage paths, and service-role RPC grants.
- A server-only structured observability helper that writes allowlisted operational events to the existing deployment log stream.
- An append-only AI usage ledger for meeting-intelligence generation attempts, with no customer-facing analytics screen.
- Small UX polish for first-use and safe operational states using the existing Calm Workspace components and Chinese localization resource.
- Private-beta onboarding, support, incident, rollback, and release-checklist documentation.

### Excluded

- New AI product features, AI chat, knowledge search, summaries editing, action-item workflows, export, billing, teams, SSO, or integrations.
- Replacing Supabase Auth, PostgreSQL/RLS, Storage, the Vercel Cron worker model, transcription, or the intelligence provider boundary.
- A live LLM transport, provider SDK integration, new external observability vendor, or client-side telemetry SDK.
- Changes to existing recording, transcript, processing-job, worker, provider, or intelligence lifecycle semantics.
- User-generated feedback collection, persisted onboarding completion, or an admin analytics dashboard.

## Architecture

Sprint 8 adds operational capabilities around, rather than inside, the established product flow.

```text
request or worker operation
  -> existing authenticated / service-role boundary
  -> allowlisted structured server event
  -> deployment logs

successful or failed intelligence provider attempt
  -> existing validated provider result / safe failure code
  -> best-effort service-role AI usage ledger write
  -> existing intelligence completion or failure persistence
```

Operational logging never includes transcript text, audio bytes, signed URLs, cookies, authorization headers, Supabase keys, provider secrets, or raw database/provider errors. Failure to record telemetry must not reverse or block an otherwise valid business operation.

## Database Change

Add one migration for `public.ai_usage_events`. This is an internal accounting ledger, not a replacement for `meeting_intelligence` metadata.

| Field                            | Design                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `id`                             | UUID primary key.                                                            |
| `meeting_intelligence_id`        | Required foreign key to `meeting_intelligence` with cascade delete.          |
| `user_id`                        | Required foreign key to `auth.users`; must match the intelligence row owner. |
| `attempt_number`                 | Positive integer copied from the claimed intelligence attempt.               |
| `provider` / `model_identifier`  | Bounded nullable identifiers; never store credentials or raw requests.       |
| `input_tokens` / `output_tokens` | Nullable non-negative integer provider usage values.                         |
| `estimated_cost_microunits`      | Nullable non-negative bigint for an optional server-side estimate.           |
| `outcome`                        | `completed` or `failed`; failed rows contain only a safe failure code.       |
| `failure_code`                   | Nullable allowlisted meeting-intelligence failure code.                      |
| `created_at`                     | Immutable server timestamp.                                                  |

The table has a unique `(meeting_intelligence_id, attempt_number)` index for idempotent attempt recording, an owner/time index, owner-only `SELECT`, no authenticated-client `INSERT`/`UPDATE`/`DELETE`, and service-role-only writer access. A database constraint verifies that `user_id` matches the linked intelligence row through a protected insert RPC or equivalent service-role validation. No usage data is displayed in the beta UI.

## Security Considerations

- Keep the browser limited to the public Supabase URL and anonymous key. `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and future provider credentials are server-only Vercel environment variables.
- Validate required public and worker configuration on process use, fail with generic messages, and never echo malformed values or secret names to the browser.
- Verify production Auth redirect URLs, cookie security, private `recordings` bucket policies, per-user object prefixes, RLS policies, and service-role-only RPC grants in a real two-user environment.
- Add only allowlisted IDs, status, safe failure code, duration, and correlation ID to logs. Redact unknown errors before logging.
- Use the existing authenticated server client for user reads and the isolated service-role client only inside worker/operations repositories.
- Do not alter owner-hidden behavior: inaccessible meeting, transcript, recording, or intelligence data continues to behave as absent or not-found where currently defined.

## Error Handling And Observability

Create a small server-only observability interface with event categories `request`, `supabase`, `storage`, `worker`, and `provider`. Each event contains a generated correlation ID, safe operation name, outcome, duration when known, and safe IDs. It writes structured JSON through the server logger only.

Integrate it at existing Server Action, query, upload-finalization, transcription-worker, and intelligence-worker error boundaries without changing their user-facing error messages. Existing safe errors remain the UI contract. The helper must be dependency-injected or directly testable so tests prove secrets and payload-like fields are removed.

## User Experience And Beta Onboarding

- Keep the existing Chinese Calm Workspace visual language and current route boundaries.
- Improve empty/error state copy only where it removes first-use ambiguity: create a meeting, upload supported audio, wait for processing, then view transcript and intelligence.
- Add a non-persistent beta onboarding panel only when the dashboard has no meetings. It uses existing cards, links, and accessible headings; it has no progress tracking, modal, or new data store.
- Ensure loading, empty, failure, keyboard focus, visible focus styles, semantic status announcements, and narrow mobile layouts remain intact for upload, transcript, and intelligence paths.
- Document a support path and expected processing behavior for beta participants; do not add an in-product feedback system.

## Testing Strategy

- Write migration contract tests before the usage-ledger migration: constraints, indexes, RLS, anonymous denial, service-role grants, and idempotency key.
- Unit-test environment parsing for production-safe URL/secret requirements without exposing values.
- Unit-test observability redaction, allowlisted event shape, correlation IDs, and best-effort failure behavior.
- Test usage-attempt mapping for completed and safe failed provider calls; test duplicate writes and cross-user rejection.
- Preserve all existing recording, transcript, worker, provider, query, and UI tests. Add focused dashboard onboarding and accessibility tests.
- Run Prettier, ESLint, strict TypeScript, the full Vitest suite, production build, `git diff --check`, and live browser QA at desktop, tablet, and mobile widths.
- Execute the documented two-user Supabase, Storage, and service-role validation in the private-beta environment before enabling beta invitations.

## Acceptance Criteria

- Production configuration requirements and deployment/rollback steps are documented and validated without exposing secrets.
- The private-beta checklist verifies existing Auth, RLS, Storage, and service-role boundaries using two distinct users.
- Server-side errors emit redacted, correlated operational events and retain existing safe user-visible messages.
- Each intelligence generation attempt can record one idempotent, owner-linked usage event; logging failure cannot fail the intelligence workflow.
- Dashboard first-use guidance is accessible, responsive, Chinese-localized, and absent once meetings exist.
- No customer-facing usage analytics, billing, AI feature expansion, lifecycle change, or architecture replacement is introduced.
- All automated checks and manual private-beta validation steps pass before release sign-off.

## Risks And Release Gates

- Real provider usage fields can vary by vendor. Persist only values the adapter provides; store `null` rather than inventing counts or costs.
- Database-level service-role behavior and RLS require a deployed Supabase validation, not only mocked tests.
- Deployment logs are not a substitute for alerting. Sprint 8 creates a reliable log foundation; alert routing remains a separate operational decision.
- Cron scheduling and provider rate limits must be configured and exercised in the beta environment before invitations are sent.
- Any need for retries, customer-visible usage, feedback collection, or support tooling beyond documentation requires a separate Sprint.
