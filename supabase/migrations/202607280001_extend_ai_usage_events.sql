alter table public.ai_usage_events
  alter column meeting_intelligence_id drop not null,
  add column meeting_id uuid references public.meetings (id) on delete cascade,
  add column latency_ms integer;

alter table public.ai_usage_events
  drop constraint ai_usage_events_operation_type_valid,
  drop constraint ai_usage_events_failure_code_valid,
  add constraint ai_usage_events_operation_type_valid check (
    operation_type in ('meeting_intelligence_generation', 'meeting_copilot_response')
  ),
  add constraint ai_usage_events_source_valid check (
    (operation_type = 'meeting_intelligence_generation' and meeting_intelligence_id is not null)
    or (operation_type = 'meeting_copilot_response' and meeting_intelligence_id is null and meeting_id is not null)
  ),
  add constraint ai_usage_events_latency_valid check (
    latency_ms is null or latency_ms >= 0
  ),
  add constraint ai_usage_events_failure_code_valid check (
    (outcome = 'completed' and failure_code is null)
    or (outcome = 'failed' and failure_code in (
      'intelligence_input_invalid', 'intelligence_input_too_large',
      'provider_rejected_input', 'provider_rate_limited', 'provider_unavailable',
      'provider_timeout', 'provider_request_failed', 'intelligence_output_invalid',
      'lease_expired', 'worker_unexpected_error'
    ))
  );

drop policy "Users can view their own AI usage events" on public.ai_usage_events;
create policy "Users can view their own AI usage events"
on public.ai_usage_events for select to authenticated
using (
  (select auth.uid()) = user_id and (
    exists (select 1 from public.meeting_intelligence where meeting_intelligence.id = ai_usage_events.meeting_intelligence_id and meeting_intelligence.user_id = (select auth.uid()))
    or exists (select 1 from public.meetings where meetings.id = ai_usage_events.meeting_id and meetings.user_id = (select auth.uid()))
  )
);

create index ai_usage_events_meeting_owner_created_idx
on public.ai_usage_events (meeting_id, user_id, created_at desc)
where meeting_id is not null;
