# Sprint 18 Vercel Production Readiness Report

## Scope

This is a read-only Vercel Production configuration audit performed on
2026-07-30. It does not deploy with `vercel --prod`, change Vercel environment
variables, modify application code, or modify database migrations.

## Decision

**Current status: conditional NO-GO.** Repository configuration and secret
boundaries are ready for review, but the Vercel project binding and remote
Production environment-variable scopes could not be verified from this
workspace. An operator must verify those remote settings before deployment.

## 1. Project Binding And Framework

| Check                          | Status       | Evidence                                                                                                                                                                                               |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current repository             | Verified     | Git remote is `https://github.com/lovelycat991016-gif/flowmind-ai.git`.                                                                                                                                |
| Current local branch           | Verified     | `main`.                                                                                                                                                                                                |
| Vercel Production branch       | Not verified | No `.vercel/project.json`, linked project metadata, or authenticated Vercel CLI is available locally. `main` is not proof of Vercel's Production branch setting.                                       |
| Vercel project binding         | Not verified | No `.vercel` directory exists in the workspace.                                                                                                                                                        |
| Framework source configuration | Verified     | `package.json` uses Next.js `15.5.0`; `next.config.ts` is a valid Next.js configuration. Vercel should select Next.js automatically, but the remote project setting still needs operator confirmation. |

Required operator check in Vercel Project Settings:

1. Confirm the project is linked to the repository above.
2. Confirm `main` is the intended Production branch.
3. Confirm Framework Preset is Next.js and the build command has not been
   overridden incompatibly.

## 2. Production Environment Variables

The following values must exist in the Vercel **Production** environment. This
audit intentionally did not read values or expose secrets.

| Variable                        | Required Production state                                        | Remote status |
| ------------------------------- | ---------------------------------------------------------------- | ------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Non-empty HTTPS URL for the approved Production Supabase project | Not verified  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Non-empty public anonymous key for that same project             | Not verified  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Non-empty server-only secret                                     | Not verified  |
| `AI_PROVIDER`                   | `deepseek`                                                       | Not verified  |
| `DEEPSEEK_API_KEY`              | Non-empty server-only secret                                     | Not verified  |
| `DEEPSEEK_MODEL`                | `deepseek-chat` or approved DeepSeek model                       | Not verified  |
| `CRON_SECRET`                   | Non-empty server-only secret used by all Cron routes             | Not verified  |

`NEXT_PUBLIC_APP_URL` is also required by the application and should be the
exact Production HTTPS origin. The current embedding policy remains outside
this task: `EMBEDDING_PROVIDER=mock` is only valid for local/Preview Demo use,
not a claim of Production semantic RAG.

## 3. Environment Scope Requirements

| Variable class                        | Production                        | Preview                                                              | Development                                  |
| ------------------------------------- | --------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| Public Supabase URL and anonymous key | Required, Production project only | Required only if Preview is enabled; use a non-Production project    | Required only for local/development workflow |
| Service-role key                      | Required, server-only             | Do not reuse the Production key; set only if Preview workers need it | Local secret only; never commit              |
| DeepSeek key                          | Required, server-only             | Optional and isolated; do not reuse Production key                   | Optional local secret only                   |
| Cron secret                           | Required, server-only             | Separate value if Preview Cron testing is intentionally enabled      | Local test value only                        |

The actual scopes are **not verified** because this workspace has no Vercel
project linkage or authenticated read-only Vercel CLI access. An operator must
check the variable names and scope labels in Vercel without displaying values.

## 4. Cron Configuration

Repository configuration is verified in `vercel.json`:

| Path                             | Schedule      |
| -------------------------------- | ------------- |
| `/api/cron/meeting-intelligence` | `*/5 * * * *` |
| `/api/cron/transcription`        | `*/5 * * * *` |
| `/api/cron/meeting-knowledge`    | `*/5 * * * *` |

The Meeting Knowledge route validates authorization before it creates an
embedding provider or invokes the worker. It returns `403` for unauthorized
requests and a generic error for worker failures. The remote Vercel Cron
registration and plan support for all three five-minute schedules remain
operator-verification items.

## 5. Secret Boundary

Repository evidence supports the intended boundary:

- `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are parsed only from
  server-side worker configuration.
- `DEEPSEEK_API_KEY` is read through server-side AI provider configuration;
  only the DeepSeek provider/factory path consumes it.
- The public runtime configuration exposes only `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The public environment parser rejects server-only values if they are supplied
  to that public configuration boundary.
- `.env.example` contains no secret values and does not include service-role,
  DeepSeek, or Cron secrets.

This is source-level evidence, not proof of the deployed bundle or Vercel
variable scopes. Before Production deployment, inspect Vercel's variable names
and Production build output/log policy to ensure no secret uses a
`NEXT_PUBLIC_` prefix and no secret value is logged.

## Operator Acceptance Checklist

- [ ] The Vercel project is linked to the approved FlowMind repository.
- [ ] `main` is confirmed as the Production branch.
- [ ] Next.js is confirmed as the Framework Preset.
- [ ] All required Production variable names exist without revealing values.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, and `CRON_SECRET` are
      Production-only server secrets and have no `NEXT_PUBLIC_` prefix.
- [ ] Preview and Development, where configured, use isolated non-Production
      credentials and separate Cron secrets.
- [ ] Vercel recognizes all three Cron routes, including
      `/api/cron/meeting-knowledge` at `*/5 * * * *`.
- [ ] An unauthorized Cron request returns only the safe rejection response.
- [ ] The deployed Production bundle and logs have been checked for secret
      exposure without printing a secret value.

## Next Step

After every unchecked remote item is explicitly verified, record the result and
obtain deployment approval. Only then may an authorized operator run
`vercel --prod`. This audit does not authorize or perform that deployment.
