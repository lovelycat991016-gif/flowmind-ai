create extension if not exists pgtap with schema extensions;

set search_path = public, extensions;
select plan(61);
select set_config('request.jwt.claim.role', 'service_role', false);

delete from auth.users
where id = '10000000-0000-0000-0000-000000000001'::uuid;

insert into auth.users (
  id,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '10000000-0000-0000-0000-000000000001'::uuid,
  'transcription-retry-test@example.invalid',
  '{}'::jsonb,
  '{}'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
);

create or replace function pg_temp.create_processing_job(
  p_job_id uuid,
  p_status public.processing_job_status default 'queued',
  p_attempt_count integer default 0,
  p_max_attempts integer default 3,
  p_next_attempt_at timestamptz default null,
  p_locked_by text default null,
  p_lease_expires_at timestamptz default null
)
returns void
language plpgsql
as $$
declare
  v_meeting_id uuid := gen_random_uuid();
  v_recording_id uuid := gen_random_uuid();
begin
  insert into public.meetings (id, user_id, title, meeting_date)
  values (
    v_meeting_id,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Transient retry integration test',
    timezone('utc', now())
  );

  insert into public.recordings (
    id,
    meeting_id,
    user_id,
    storage_path,
    original_filename,
    mime_type,
    file_size_bytes,
    status,
    uploaded_at
  )
  values (
    v_recording_id,
    v_meeting_id,
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001/' || v_recording_id::text || '.mp3',
    'retry-test.mp3',
    'audio/mpeg',
    1024,
    'uploaded',
    timezone('utc', now())
  );

  insert into public.processing_jobs (
    id,
    recording_id,
    user_id,
    status,
    attempt_count,
    max_attempts,
    next_attempt_at,
    locked_at,
    locked_by,
    lease_expires_at
  )
  values (
    p_job_id,
    v_recording_id,
    '10000000-0000-0000-0000-000000000001'::uuid,
    p_status,
    p_attempt_count,
    p_max_attempts,
    p_next_attempt_at,
    case when p_status = 'running' then timezone('utc', now()) else null end,
    p_locked_by,
    p_lease_expires_at
  );
end;
$$;

create or replace function pg_temp.clear_processing_jobs()
returns void
language sql
as $$
  delete from public.meetings
  where user_id = '10000000-0000-0000-0000-000000000001'::uuid;
$$;

select has_column('public', 'processing_jobs', 'next_attempt_at', 'next_attempt_at exists');
select col_type_is('public', 'processing_jobs', 'next_attempt_at', 'timestamp with time zone', 'next_attempt_at uses timestamptz');
select col_is_null('public', 'processing_jobs', 'next_attempt_at', 'next_attempt_at remains nullable');
select ok(
  (
    select
      pg_get_expr(index_definition.indexprs, index_definition.indrelid) ~*
        'coalesce\s*\(\s*next_attempt_at\s*,\s*''-infinity''::(timestamptz|timestamp with time zone)\s*\)'
      and pg_get_expr(index_definition.indpred, index_definition.indrelid) ~*
        'status\s*=\s*''queued''::processing_job_status'
      and pg_get_expr(index_definition.indpred, index_definition.indrelid) ~*
        'attempt_count\s*<\s*max_attempts'
      and pg_get_expr(index_definition.indpred, index_definition.indrelid) !~*
        'now\s*\('
    from pg_index as index_definition
    where index_definition.indexrelid =
      'public.processing_jobs_claimable_idx'::regclass
  ),
  'claimable index supports nullable retry due times without now() in its predicate'
);

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000001');
select is((select count(*) from public.claim_next_processing_job('null-due-worker', 300)), 1::bigint, 'null next_attempt_at is claimable');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000001'), 'running', 'claim transitions a queued job to running');
select is((select attempt_count from public.processing_jobs where id = '20000000-0000-0000-0000-000000000001'), 1, 'claim increments attempt_count exactly once');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000002', p_next_attempt_at => timezone('utc', now()) - interval '1 second');
select is((select count(*) from public.claim_next_processing_job('past-due-worker', 300)), 1::bigint, 'elapsed next_attempt_at is claimable');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000003', p_next_attempt_at => timezone('utc', now()) + interval '1 hour');
select is_empty($$select id from public.claim_next_processing_job('future-due-worker', 300)$$, 'future next_attempt_at is not claimable');
select is((select attempt_count from public.processing_jobs where id = '20000000-0000-0000-0000-000000000003'), 0, 'deferred job does not consume an attempt');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000004', p_next_attempt_at => timezone('utc', now()) - interval '1 minute');
select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000005');
update public.processing_jobs
set created_at = case id
  when '20000000-0000-0000-0000-000000000004'::uuid
    then '2000-01-01 00:00:00+00'::timestamptz
  else '2000-01-02 00:00:00+00'::timestamptz
end
where id in (
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005'
);
select is(
  (select id from public.claim_next_processing_job('created-at-order-worker', 300)),
  '20000000-0000-0000-0000-000000000004'::uuid,
  'older eligible job is claimed before newer eligible job'
);
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000007');
select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000006');
update public.processing_jobs
set created_at = '2000-01-03 00:00:00+00'::timestamptz
where id in (
  '20000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000007'
);
select is(
  (select id from public.claim_next_processing_job('id-order-worker', 300)),
  '20000000-0000-0000-0000-000000000006'::uuid,
  'smaller id breaks ties between equally old eligible jobs'
);
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000010', 'running', 1, 3, null, 'timeout-worker-1', timezone('utc', now()) + interval '5 minutes');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000010', 'timeout-worker-1', 'provider_timeout');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 'queued', 'provider_timeout is retried');
select is((select last_error_code from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 'provider_timeout', 'retry records its latest safe failure code');
select is((select extract(epoch from next_attempt_at - timezone('utc', now()))::integer from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 60, 'first transient failure backs off one minute');
select is((select attempt_count from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 1, 'failure does not increment attempt_count');
update public.processing_jobs set next_attempt_at = timezone('utc', now()) - interval '1 second' where id = '20000000-0000-0000-0000-000000000010';
select is((select count(*) from public.claim_next_processing_job('timeout-worker-2', 300)), 1::bigint, 'retry is claimable after backoff');
select is((select attempt_count from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 2, 'retry claim consumes the second attempt');
select is((select next_attempt_at from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), null::timestamptz, 'claim clears next_attempt_at');
select is((select last_error_code from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), null::text, 'claim clears the previous retry error');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000010', 'timeout-worker-2', 'provider_timeout');
select is((select extract(epoch from next_attempt_at - timezone('utc', now()))::integer from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 300, 'second transient failure backs off five minutes');
update public.processing_jobs set next_attempt_at = timezone('utc', now()) - interval '1 second' where id = '20000000-0000-0000-0000-000000000010';
select is((select count(*) from public.claim_next_processing_job('timeout-worker-3', 300)), 1::bigint, 'final configured attempt can be claimed');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000010', 'timeout-worker-3', 'provider_timeout');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 'failed', 'third transient failure is terminal');
select is((select attempt_count from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 3, 'attempt_count stops at max_attempts');
select is((select next_attempt_at from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), null::timestamptz, 'terminal transient failure clears next_attempt_at');
select is((select last_error_code from public.processing_jobs where id = '20000000-0000-0000-0000-000000000010'), 'provider_timeout', 'terminal transient failure preserves final code');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000011', 'running', 3, 4, null, 'extended-worker', timezone('utc', now()) + interval '5 minutes');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000011', 'extended-worker', 'provider_unavailable');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000011'), 'queued', 'larger attempt budget remains retryable');
select is((select extract(epoch from next_attempt_at - timezone('utc', now()))::integer from public.processing_jobs where id = '20000000-0000-0000-0000-000000000011'), 300, 'later retries use fixed five minute backoff');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000020', 'running', 1, 3, null, 'rate-worker', timezone('utc', now()) + interval '5 minutes');
select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000021', 'running', 1, 3, null, 'unavailable-worker', timezone('utc', now()) + interval '5 minutes');
select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000022', 'running', 1, 3, null, 'storage-worker', timezone('utc', now()) + interval '5 minutes');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000020', 'rate-worker', 'provider_rate_limited');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000021', 'unavailable-worker', 'provider_unavailable');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000022', 'storage-worker', 'storage_unavailable');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000020'), 'queued', 'provider_rate_limited is retried');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000021'), 'queued', 'provider_unavailable is retried');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000022'), 'queued', 'storage_unavailable is retried');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000030', 'running', 1, 3, null, 'request-worker', timezone('utc', now()) + interval '5 minutes');
select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000031', 'running', 1, 3, null, 'invalid-worker', timezone('utc', now()) + interval '5 minutes');
select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000032', 'running', 1, 3, null, 'rejected-worker', timezone('utc', now()) + interval '5 minutes');
select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000033', 'running', 1, 3, null, 'unexpected-worker', timezone('utc', now()) + interval '5 minutes');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000030', 'request-worker', 'provider_request_failed');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000031', 'invalid-worker', 'invalid_audio');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000032', 'rejected-worker', 'provider_rejected_audio');
select public.fail_transcription_job('20000000-0000-0000-0000-000000000033', 'unexpected-worker', 'worker_unexpected_error');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000030'), 'failed', 'provider_request_failed is terminal');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000031'), 'failed', 'invalid_audio is terminal');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000032'), 'failed', 'provider_rejected_audio is terminal');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000033'), 'failed', 'worker_unexpected_error is terminal');
select is((select last_error_code from public.processing_jobs where id = '20000000-0000-0000-0000-000000000030'), 'provider_request_failed', 'terminal failure stores final safe code');
select ok((select bool_and(next_attempt_at is null) from public.processing_jobs where id in ('20000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000033')), 'permanent failures have no retry schedule');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000040', 'running', 1, 3, null, 'expired-worker', timezone('utc', now()) - interval '1 minute');
select is((select count(*) from public.claim_next_processing_job('reclaim-worker', 300)), 1::bigint, 'expired running lease is reclaimed');
select is((select attempt_count from public.processing_jobs where id = '20000000-0000-0000-0000-000000000040'), 2, 'expired reclaim shares the attempt budget');
select is((select locked_by from public.processing_jobs where id = '20000000-0000-0000-0000-000000000040'), 'reclaim-worker', 'reclaim replaces invocation token');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000041', 'running', 3, 3, null, 'exhausted-worker', timezone('utc', now()) - interval '1 minute');
select is_empty($$select id from public.claim_next_processing_job('must-not-reclaim', 300)$$, 'exhausted expired lease is not reclaimed');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000041'), 'failed', 'exhausted expired lease becomes failed');
select is((select last_error_code from public.processing_jobs where id = '20000000-0000-0000-0000-000000000041'), 'lease_expired', 'exhausted lease records lease_expired');
select ok((select locked_by is null and lease_expires_at is null from public.processing_jobs where id = '20000000-0000-0000-0000-000000000041'), 'exhausted lease clears fencing fields');
select pg_temp.clear_processing_jobs();

select pg_temp.create_processing_job('20000000-0000-0000-0000-000000000050', 'running', 2, 3, null, 'current-token', timezone('utc', now()) + interval '5 minutes');
select throws_ok($$select public.fail_transcription_job('20000000-0000-0000-0000-000000000050', 'stale-token', 'provider_timeout')$$, 'P0001', 'invalid job lease', 'stale token cannot fail a newer lease');
select throws_ok($$select public.complete_transcription_job('20000000-0000-0000-0000-000000000050', 'stale-token', recording_id, user_id, 'aliyun', 'test-model', 'zh', 'test transcript', '[{"segment_index":0,"start_ms":0,"end_ms":1,"content":"test"}]'::jsonb) from public.processing_jobs where id = '20000000-0000-0000-0000-000000000050'$$, 'P0001', 'invalid job lease', 'stale token cannot complete a newer lease');
select is((select status::text from public.processing_jobs where id = '20000000-0000-0000-0000-000000000050'), 'running', 'stale writes leave current lease unchanged');
select pg_temp.clear_processing_jobs();

select ok((select prosecdef from pg_proc where oid = 'public.claim_next_processing_job(text,integer)'::regprocedure), 'claim RPC remains SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid = 'public.fail_transcription_job(uuid,text,text)'::regprocedure), 'failure RPC remains SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.claim_next_processing_job(text,integer)'::regprocedure), array['search_path=public']::text[], 'claim RPC fixes search_path');
select is((select proconfig from pg_proc where oid = 'public.fail_transcription_job(uuid,text,text)'::regprocedure), array['search_path=public']::text[], 'failure RPC fixes search_path');
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'public.claim_next_processing_job(text,integer)'::regprocedure), 'postgres', 'claim RPC owner is postgres');
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'public.fail_transcription_job(uuid,text,text)'::regprocedure), 'postgres', 'failure RPC owner is postgres');
select ok(not has_function_privilege('anon', 'public.claim_next_processing_job(text,integer)', 'execute'), 'anon cannot execute claim RPC');
select ok(not has_function_privilege('authenticated', 'public.claim_next_processing_job(text,integer)', 'execute'), 'authenticated cannot execute claim RPC');
select ok(has_function_privilege('service_role', 'public.claim_next_processing_job(text,integer)', 'execute'), 'service_role can execute claim RPC');
select ok(not has_function_privilege('anon', 'public.fail_transcription_job(uuid,text,text)', 'execute'), 'anon cannot execute failure RPC');
select ok(not has_function_privilege('authenticated', 'public.fail_transcription_job(uuid,text,text)', 'execute'), 'authenticated cannot execute failure RPC');
select ok(has_function_privilege('service_role', 'public.fail_transcription_job(uuid,text,text)', 'execute'), 'service_role can execute failure RPC');
select is(pg_get_function_result('public.claim_next_processing_job(text,integer)'::regprocedure), 'TABLE(id uuid, recording_id uuid, user_id uuid, attempt_count integer, max_attempts integer, locked_at timestamp with time zone, locked_by text, lease_expires_at timestamp with time zone)', 'claim RPC return signature is unchanged');
select is(pg_get_function_result('public.fail_transcription_job(uuid,text,text)'::regprocedure), 'void', 'failure RPC return signature is unchanged');

select pg_temp.clear_processing_jobs();
delete from auth.users
where id = '10000000-0000-0000-0000-000000000001'::uuid;

select * from finish();
