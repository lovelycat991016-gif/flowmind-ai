alter table public.transcripts
  drop constraint transcripts_provider_valid,
  add constraint transcripts_provider_valid check (
    provider in ('openai', 'aliyun')
  );
