# Sprint 7 Meeting Intelligence QA

## Scope

Sprint 7 adds an owner-isolated meeting-intelligence foundation. It derives a structured summary, action items, and decisions from an existing transcript through a lease-protected worker boundary, then renders the result read-only in meeting detail.

This Sprint does not add AI chat, knowledge search, user-authored prompts, action-item editing, transcript editing, a new API route, or a live LLM credential integration.

## Schema Verification

Apply the following migrations after the Sprint 6 migrations:

1. `202607210001_add_meeting_intelligence.sql` creates `meeting_intelligence`, its lifecycle enum, owner-only read policy, indexes, constraints, and the existing `set_updated_at` trigger.
2. `202607210002_add_meeting_intelligence_worker.sql` adds attempt, lease, validated result, and safe failure-code fields, plus the service-role-only claim RPC.

Automated migration contract tests verify the enum, foreign keys to meetings and transcripts, active-result uniqueness, owner/status indexes, the trigger, RLS enablement, authenticated `SELECT` grant, anonymous revocation, worker-field constraints, and the service-role RPC grant.

Before a deployed release, apply both migrations to the target Supabase project and confirm their order and success in the Supabase migration history.

## Worker Boundary Verification

- `claim_next_meeting_intelligence` is a `security definer` RPC granted only to `service_role`; it refuses other database roles.
- Claiming uses `FOR UPDATE SKIP LOCKED`, increments the attempt count, assigns the worker ID, and transitions one queued row to `running` with a lease expiry.
- The worker repository uses the server-only service-role client. It validates the transcript through the recording and meeting ownership chain before generation.
- Completion and failure updates require the claimed row, owner, `running` status, and matching lease owner. Stored failures contain only a safe failure code.
- Worker tests cover one successful execution, safe missing-transcript/provider failure handling, and no provider execution when no job is claimable.

## Provider Isolation

- `MeetingIntelligenceProvider` is provider-neutral and accepts normalized transcript text, language, and prompt version.
- `StructuredMeetingIntelligenceProvider` receives an injected transport, parses structured JSON, and validates it with the meeting-intelligence Zod schema before persistence.
- Raw transport failures, timeouts, malformed JSON, and schema failures become safe domain failure codes. Provider details are not returned to the UI.
- The provider receives transcript content only. It receives neither Supabase credentials nor Storage credentials.

The current MVP verifies this boundary with mocked transport. A production LLM transport, provider credentials, rate limits, and live model behavior require separately approved operational configuration.

## Ownership Model

- `meeting_intelligence.user_id` must match the authenticated user and its `meeting_id` must belong to that same user for RLS reads.
- Browser and Server Component reads use the authenticated Supabase server client through `getMeetingIntelligence`.
- Missing and RLS-hidden intelligence both return `null`; query errors expose only a generic application error.
- Worker-side service-role access remains isolated to the worker repository. It revalidates the transcript, recording, meeting, and owner relationship before persistence.

Automated query tests cover owner-visible results, inaccessible rows behaving as absent, malformed stored output being hidden, and safe status presentation.

## UI State Coverage

- Completed intelligence shows a semantic meeting-intelligence heading, summary, labelled action-item list, and labelled decision list.
- Queued and running states announce a processing message with `role="status"`.
- Failed and cancelled states show a safe unavailable message with no provider details.
- Missing intelligence shows an empty `role="status"` state.
- Archived meetings preserve result visibility and show a read-only message; no mutation control is introduced.
- The section uses the existing responsive Calm Workspace card layout and list styles, with no color-only status meaning.

Component and route tests cover completed rendering, accessible lists, all non-completed status states, missing data, archived read-only behavior, and owner-scoped page data flow.

## Final Automated Verification

The release verification gate runs:

- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

## Known Limitations

- A target Supabase project still requires live migration, two-user RLS, and service-role RPC verification before release.
- The provider adapter is exercised with injected mock transport only; no external LLM credential or live model request is included in this Sprint.
- Vercel Cron scheduling, worker secret delivery, lease-expiry recovery, provider rate limiting, and production observability require environment-level validation before enabling unattended generation.
- The UI intentionally provides no retry, regeneration, editing, approval, or export controls for intelligence output.
- No desktop, tablet, or mobile browser screenshots were added for Sprint 7. The responsive layout is covered by existing component styling and automated accessibility assertions; live browser QA remains a release checklist item.
