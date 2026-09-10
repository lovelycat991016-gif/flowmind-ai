# FlowMind Production Scheduler Relay

This Cloudflare Worker is only a scheduler relay. Every five minutes it
wakes the existing FlowMind Vercel endpoints with the configured
`CRON_SECRET`.

## Architecture

```text
Cloudflare Cron
  -> Cloudflare Relay
  -> existing Vercel endpoint
  -> existing FlowMind Worker
  -> existing queue / claim / lease / fencing
```

The two endpoint calls start concurrently and collect their results
independently:

- `GET https://flowmind-ai-liard.vercel.app/api/cron/transcription`
- `GET https://flowmind-ai-liard.vercel.app/api/cron/meeting-intelligence`

## Responsibilities

The relay does:

- wake the existing Vercel endpoints;
- send `CRON_SECRET` as a Bearer token;
- retry transient network, timeout, 408, 429, 500, 502, 503, and 504
  failures once;
- record endpoint, HTTP status, latency, attempt, and safe business
  summary fields.

The relay does not:

- claim jobs or implement a queue;
- process audio or call ASR;
- call an LLM;
- access Supabase or any database;
- implement lease, fencing, or business retry state;
- treat HTTP 200 as proof that a job completed.

## Secret

Configure `CRON_SECRET` as a Cloudflare Worker Secret. Never place its
value in source code, Wrangler configuration, local environment files,
logs, or snapshots.

```sh
npx wrangler secret put CRON_SECRET
```

The relay never logs the secret, Authorization header, request headers,
or complete response bodies.

## Local verification

From this directory after installing development dependencies:

```sh
npm test
npm run typecheck
npm run format:check
```

This directory has not been deployed by its creation alone. Deployment
and Cron activation require a separate Production change approval.
