# Sprint 18 Production Identity Confirmation Report

## Scope

This is a read-only identity verification for the confirmed Production domain
`https://flowmind-ai-liard.vercel.app/`, performed on 2026-07-30. It does not
create data, call AI, invoke a Cron route, change Vercel settings, or change
application code.

## Result

**Domain identity confirmed; deployment provenance and remote configuration are
not fully verifiable from this workspace.**

The confirmed domain is serving the FlowMind meeting-intelligence application,
not the unrelated application observed at the earlier inferred domain.

## 1. Vercel Project And Application Identity

| Check                       | Result                | Evidence                                                                                                                                                                               |
| --------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmed Production domain | Verified              | The browser reached `https://flowmind-ai-liard.vercel.app/`.                                                                                                                           |
| Application identity        | Verified              | An unauthenticated request was redirected to `/login?next=%2Fdashboard`; the rendered title was `登录                                                                                  | FlowMind AI` and the visible copy described the FlowMind meeting workspace. |
| Vercel project identity     | Partially verified    | The `.vercel.app` domain establishes Vercel hosting, but this workspace has no `.vercel/project.json`, Vercel CLI, or authenticated Vercel API access to identify the project ID/name. |
| Git repository binding      | Not verified remotely | Local `origin` is `https://github.com/lovelycat991016-gif/flowmind-ai.git`, but the Vercel dashboard/API is required to prove the deployment is linked to that repository.             |

## 2. Production Deployment Commit

| Check                         | Result        | Evidence                                                                                                                                        |
| ----------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Local current commit          | Recorded only | Local `main` HEAD is `af87935bf45c1c80b68ea0134bf47523ad9183a0` (`docs: prepare production deployment execution`).                              |
| Commit deployed to Production | Not verified  | The public application response did not expose Vercel deployment Git metadata, and no linked/authenticated Vercel project context is available. |

Do not treat the local HEAD as evidence that it is the deployed commit. Confirm
the Production deployment commit in the Vercel deployment details before
release acceptance.

## 3. Runtime Configuration

Runtime secret values and variable scope were intentionally not read. Public
page inspection cannot prove the following values are present or scoped
correctly in Vercel Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY`
- `CRON_SECRET`

The successful FlowMind login rendering proves that the deployed application
can serve its unauthenticated route; it does not validate authenticated
Supabase access, DeepSeek configuration, service-role availability, or Cron
authorization. Verify only variable names and environment scopes in Vercel;
do not display values.

## 4. Cron Route Availability

The checked-in `vercel.json` declares all expected schedules:

| Route                            | Schedule      | Live endpoint invoked? |
| -------------------------------- | ------------- | ---------------------- |
| `/api/cron/meeting-intelligence` | `*/5 * * * *` | No                     |
| `/api/cron/transcription`        | `*/5 * * * *` | No                     |
| `/api/cron/meeting-knowledge`    | `*/5 * * * *` | No                     |

No direct route availability request was made because these GET endpoints may
claim work and trigger workers. Confirm Cron registration, schedule support,
and the most recent safe executions in Vercel's Cron dashboard/logs.

## Remaining Operator Checks

- [ ] Confirm the Vercel project is linked to
      `lovelycat991016-gif/flowmind-ai`.
- [ ] Confirm Production deploys the approved commit and `main` branch.
- [ ] Confirm all required environment-variable names exist in Production with
      correct scopes, without revealing values.
- [ ] Confirm Vercel registered the three declared Cron schedules.
- [ ] Confirm recent Cron execution records show safe authorization and no
      secret exposure.

After these remote control-plane checks are complete, proceed to the controlled
application workflow validation using non-sensitive test accounts and fixture
data.
