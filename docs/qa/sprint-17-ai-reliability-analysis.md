# Sprint 17 AI Reliability Analysis

## Scope

This runbook defines read-only server-side reliability analytics from existing
`ai_usage_events`. It does not add event writes, change provider behavior,
alter worker lifecycle, modify RLS, or introduce a database migration.

## Data Source And Access Boundary

The analysis reads only `provider`, `model_identifier`, `operation_type`,
`outcome`, `failure_code`, and `latency_ms`. It uses the authenticated server
Supabase client, so the existing owner-scoped RLS policy limits the result to
the current user's visible events. It must not use a service-role client for
user-facing reliability reporting.

## Metrics

Metrics are grouped by provider, model identifier, and operation type.
The success rate and failure breakdown use the definitions below.

| Metric | Definition |
| --- | --- |
| Request count | Number of owner-visible events in the group. |
| Success rate | Completed requests divided by request count, represented from 0 to 1. |
| Failure breakdown | Failed request count per safe `failure_code`; a missing code is reported as `unknown_failure`. |
| Latency sample count | Number of events with a non-null `latency_ms`. |
| Minimum / maximum latency | Lowest and highest recorded latency in milliseconds. |
| Average latency | Arithmetic mean of recorded latency values in milliseconds. |
| p50 latency | Nearest-rank 50th percentile of sorted recorded latency values. |
| p95 latency | Nearest-rank 95th percentile of sorted recorded latency values. |

When a group has no latency samples, every latency value except sample count
is `null`. Empty event input produces no groups. The aggregate is intentionally
not a billing, quota, or customer-facing SLA system.

## Failure Classification

`failure_breakdown` is limited to the existing safe event `failure_code` values
such as `provider_timeout`, `provider_rate_limited`, `provider_unavailable`,
`provider_request_failed`, `intelligence_output_invalid`, and
`worker_unexpected_error`. It must never attempt to infer a provider error from
raw error text. A failure event without a code remains visible only as the
generic `unknown_failure` category.

## Privacy Boundary

Reliability analytics must not read, persist, return, or log a prompt,
transcript, audio, response body, raw provider error, or API key. It also must
not select meeting content, user identifiers, or internal request payloads.
The result contains only group labels, counters, safe failure categories, and
latency metrics. The existing `ai_usage_events` RLS policy remains the source
of owner isolation.

## Future Token And Cost Extension

The existing ledger already reserves nullable `input_tokens`, `output_tokens`,
and `estimated_cost_microunits` fields. A future, separately approved provider
adapter enhancement may write provider-supplied usage values after validating
they are non-negative and safe to retain. Cost reporting must use the stored
`estimated_cost_microunits` value, never a prompt, transcript, raw response,
API key, or unredacted provider payload. That work requires its own privacy,
provider-contract, and pricing-version review; it is outside this task.
