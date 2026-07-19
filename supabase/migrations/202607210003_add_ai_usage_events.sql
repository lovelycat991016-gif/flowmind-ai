create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  meeting_intelligence_id uuid not null references public.meeting_intelligence (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_type text not null,
  attempt_number integer not null,
  provider text,
  model_identifier text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_microunits bigint,
  outcome text not null,
  failure_code text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ai_usage_events_operation_type_valid check (
    operation_type = 'meeting_intelligence_generation'
  ),
  constraint ai_usage_events_attempt_number_valid check (
    attempt_number between 1 and 10
  ),
  constraint ai_usage_events_provider_valid check (
    provider is null or (
      provider = btrim(provider)
      and char_length(provider) between 1 and 50
    )
  ),
  constraint ai_usage_events_model_identifier_valid check (
    model_identifier is null or (
      model_identifier = btrim(model_identifier)
      and char_length(model_identifier) between 1 and 100
    )
  ),
  constraint ai_usage_events_input_tokens_valid check (
    input_tokens is null or input_tokens >= 0
  ),
  constraint ai_usage_events_output_tokens_valid check (
    output_tokens is null or output_tokens >= 0
  ),
  constraint ai_usage_events_cost_valid check (
    estimated_cost_microunits is null or estimated_cost_microunits >= 0
  ),
  constraint ai_usage_events_outcome_valid check (
    outcome in ('completed', 'failed')
  ),
  constraint ai_usage_events_failure_code_valid check (
    (outcome = 'completed' and failure_code is null)
    or (
      outcome = 'failed'
      and failure_code in (
        'intelligence_input_invalid',
        'intelligence_input_too_large',
        'provider_rejected_input',
        'provider_rate_limited',
        'provider_unavailable',
        'provider_timeout',
        'provider_request_failed',
        'intelligence_output_invalid',
        'lease_expired',
        'worker_unexpected_error'
      )
    )
  )
);

alter table public.ai_usage_events enable row level security;

create policy "Users can view their own AI usage events"
on public.ai_usage_events for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.meeting_intelligence
    where meeting_intelligence.id = ai_usage_events.meeting_intelligence_id
      and meeting_intelligence.user_id = (select auth.uid())
  )
);

create unique index ai_usage_events_intelligence_attempt_idx
on public.ai_usage_events (meeting_intelligence_id, attempt_number);

create index ai_usage_events_owner_created_idx
on public.ai_usage_events (user_id, created_at desc);

revoke all on table public.ai_usage_events from anon;
revoke insert, update, delete on table public.ai_usage_events from authenticated;
grant select on table public.ai_usage_events to authenticated;
grant select, insert on table public.ai_usage_events to service_role;
