# Sprint 13 LLM Provider Integration Design

## Objective

Enable FlowMind to use DeepSeek as its default server-side LLM while retaining provider-neutral boundaries for OpenAI and future providers. The existing transcription-to-intelligence worker flow and the meeting Copilot flow remain intact; Sprint 13 replaces only the provider composition behind those boundaries.

## Scope Boundary

### Included

- A server-only `AIProvider` composition boundary that selects the active provider from validated environment configuration.
- `DeepSeekAdapter` as the default real provider for meeting intelligence and Copilot requests.
- An `OpenAIAdapter` reservation point that reuses the existing provider-neutral contracts without making OpenAI the default.
- A deterministic Mock fallback for Copilot when no real provider is configured or when explicitly selected for local/test use.
- DeepSeek-compatible structured-output request/response mapping, followed by existing Zod validation for meeting intelligence.
- Safe provider error classification, redacted observability metadata, Chinese user-facing fallback states, and test coverage.
- Documentation for deployment configuration and provider switching.

### Excluded

- Changes to Supabase Auth, cookies, middleware, RLS, Storage policy, recordings, transcripts, meetings, or existing processing-job schemas.
- Changes to the `meeting_intelligence` lifecycle: `queued -> running -> completed / failed / cancelled` remains authoritative.
- New worker infrastructure, queue consumers, client-side provider calls, streaming, model fine-tuning, prompt authoring UI, billing, quotas, or analytics product features.
- Exposing raw provider errors, API keys, request payloads, recordings, or transcripts in browser code or logs.

## Current Architecture And Migration Boundary

The meeting intelligence worker claims queued `meeting_intelligence` rows, reads a transcript or approved text input, invokes `MeetingIntelligenceProvider`, validates the normalized `MeetingIntelligenceResult`, and persists the result. `MeetingCopilotProvider` currently has a deterministic mock implementation used by the existing Server Action.

Sprint 13 does not change the worker claim, lease, transcript repository, persistence logic, Server Action ownership checks, or response schemas. It changes provider construction only:

```text
Meeting intelligence worker / Copilot Server Action
                  |
                  v
        provider factory (server-only)
                  |
        +---------+----------+
        |                    |
        v                    v
 DeepSeekAdapter       OpenAIAdapter (reserved)
        |
        +---- deterministic Mock fallback (Copilot only)
```

The intelligence and Copilot products share transport/error classification utilities where contracts overlap, but retain separate request mapping because intelligence requires structured JSON and Copilot requires safe conversational text.

## Provider Architecture

### Provider contracts

- `MeetingIntelligenceProvider.generate(request)` continues to return a provider-neutral `MeetingIntelligenceResult`.
- `MeetingCopilotProvider.generate(request)` is broadened so its response records an allowlisted provider identifier (`deepseek`, `openai`, or `mock`) without exposing models, raw payloads, or transport details to the client.
- `AIProviderFactory` is server-only. It reads a validated provider configuration once per execution boundary and returns a provider implementation through dependency injection. Business logic imports contracts/factory functions, not the DeepSeek HTTP implementation.

### DeepSeek adapter

`DeepSeekAdapter` uses server-side `fetch` against the DeepSeek chat-completions-compatible API. It sends only the approved request content, a fixed system instruction, model identifier, and structured-output instruction. It has a bounded request timeout through `AbortSignal.timeout` (or an equivalent server-side abort controller).

For intelligence, the adapter requests JSON with exactly:

```json
{
  "summary": "string",
  "key_points": ["string"],
  "decisions": ["string"],
  "action_items": [
    { "task": "string", "owner": "string?", "deadline": "YYYY-MM-DD?" }
  ],
  "risks": ["string"]
}
```

The adapter parses JSON defensively, maps snake_case fields into the existing domain result shape, then validates with the existing Zod schema. A malformed response is a safe provider/domain failure; it is never persisted as completed output.

For Copilot, the adapter maps only bounded assistant text into the existing server action response. It must not be called from a browser component.

### OpenAI reservation

The existing OpenAI intelligence adapter remains isolated behind the same provider-neutral contracts. Sprint 13 may move it under the common factory but does not require an OpenAI key or enable OpenAI by default. The provider selector must reject unsupported provider values rather than silently choosing another real provider.

## Environment Configuration

All values are server-only and must never use the `NEXT_PUBLIC_` prefix.

| Variable           | Required when          | Meaning                                    | Default                                                                              |
| ------------------ | ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `AI_PROVIDER`      | Real provider use      | `deepseek`, `openai`, or `mock`            | `deepseek` in production configuration; `mock` for explicit local/test configuration |
| `DEEPSEEK_API_KEY` | `AI_PROVIDER=deepseek` | DeepSeek server credential                 | none                                                                                 |
| `DEEPSEEK_MODEL`   | Optional with DeepSeek | DeepSeek chat model                        | `deepseek-chat`                                                                      |
| `OPENAI_API_KEY`   | `AI_PROVIDER=openai`   | Existing reserved OpenAI server credential | none                                                                                 |
| `OPENAI_MODEL`     | Optional with OpenAI   | Existing OpenAI model setting              | existing default                                                                     |

Configuration parsing is discriminated by `AI_PROVIDER`. Selecting `deepseek` without `DEEPSEEK_API_KEY` fails closed during server execution with a safe configuration failure. The client bundle must not import environment parsing modules.

## Data Flows

### Meeting intelligence

```text
Transcript or input_text
  -> existing queued meeting_intelligence row
  -> existing worker authentication + atomic lease claim
  -> provider factory selects DeepSeekAdapter
  -> DeepSeek structured JSON response
  -> Zod validation + domain mapping
  -> existing lease-safe completed persistence

Provider/configuration/timeout/malformed-output error
  -> safe error classification
  -> existing lease-safe failed persistence
```

The worker never sends audio objects or Storage URLs to the LLM provider. It continues to send only the existing approved text input.

### Meeting Copilot

```text
Authenticated owner Server Action
  -> existing meeting ownership / archived checks
  -> provider factory selects configured adapter
  -> bounded response mapped to MeetingCopilotResponse
  -> existing owner-scoped message persistence

No real provider configured or explicit mock selection
  -> DeterministicMockMeetingCopilotProvider
```

Provider failure returns the existing safe Chinese error result; raw status codes, provider body, request contents, and secrets stay server-side. A failed real-provider request does not automatically fabricate an assistant answer.

## Security And Reliability

- API keys are loaded only in server-only modules and are redacted from all logs.
- Provider errors are normalized to allowlisted classes: configuration, timeout, rate-limited, unavailable, rejected input, malformed output, and unexpected request failure.
- Observability records provider id, operation type, error class, and duration only. It does not record prompts, transcript text, audio, response content, headers, keys, or raw API responses.
- Existing authenticated server clients and RLS remain the data-access boundary. The service-role worker remains isolated from browser code.
- Provider selection is injected in tests; tests never read production environment variables or make network requests.

## Testing Strategy

- Environment tests: valid DeepSeek config, missing key, invalid provider, default model, and no client-side import.
- Provider contract tests: request construction, allowed provider identifiers, DeepSeek response mapping, structured JSON parse failure, Zod validation failure, timeout, rate-limit, and safe unexpected error mapping using injected `fetch` transport.
- Factory tests: `deepseek`, `openai`, and explicit `mock` selection; no implicit real-provider fallback on an invalid configuration.
- Worker integration tests: claimed job invokes injected DeepSeek provider contract; valid output reaches existing persistence; failure moves the job through existing safe failure handling; no lifecycle change.
- Copilot action tests: configured provider result persistence, explicit mock fallback, safe provider failure, no raw error leakage, and archived/owner regression coverage.
- Final regression: full test suite, lint, strict typecheck, production build, and `git diff --check`.

## Acceptance Criteria

- `AI_PROVIDER=deepseek` with a valid key invokes DeepSeek only from server code and uses `DEEPSEEK_MODEL` or `deepseek-chat`.
- Meeting intelligence preserves its current claim, lifecycle, Zod result schema, and persistence path while using a selected provider.
- Copilot can use DeepSeek when configured and the deterministic Mock provider when explicitly configured; failures are safe and non-leaking.
- OpenAI remains selectable only through the provider boundary and is not the default.
- No API key reaches the client bundle, UI, logs, database result metadata, or error responses.
- Existing authentication, middleware, RLS, meetings, recording/transcription schema, and worker architecture pass regressions unchanged.

## Risks And Rollback

- Provider API compatibility or JSON-mode differences may cause malformed output. Zod validation and existing failure persistence keep invalid output out of completed results.
- Rate limits, outages, and timeouts create failed intelligence jobs under existing lifecycle rules; retries remain an operational action, not an unbounded loop.
- A misconfigured `AI_PROVIDER` fails closed rather than falling back to an unintended external provider. Copilot mock fallback is explicit configuration only.
- Rollback consists of setting `AI_PROVIDER=mock` for Copilot and disabling/withholding worker invocations in deployment configuration; no database rollback is required because Sprint 13 does not introduce a migration.
