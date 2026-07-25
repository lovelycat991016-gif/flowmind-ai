revoke execute on function public.claim_next_meeting_intelligence(text, integer) from anon, authenticated;
revoke execute on function public.claim_next_meeting_intelligence(text, integer) from public;
grant execute on function public.claim_next_meeting_intelligence(text, integer) to service_role;
