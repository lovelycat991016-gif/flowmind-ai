create index meeting_document_chunks_embedding_hnsw_idx
on public.meeting_document_chunks using hnsw (embedding vector_cosine_ops)
where embedding is not null;

create or replace function public.match_meeting_document_chunks(
  p_query_embedding vector(1536),
  p_match_count integer,
  p_meeting_id uuid default null
)
returns table (content text, metadata jsonb, meeting_id uuid, similarity double precision)
language plpgsql stable security invoker set search_path = public as $$
begin
  if p_match_count not between 1 and 20 then raise exception 'invalid match count'; end if;
  return query
  select chunks.content, chunks.metadata, chunks.meeting_id,
    (1 - (chunks.embedding <=> p_query_embedding))::double precision
  from public.meeting_document_chunks chunks
  where chunks.user_id = (select auth.uid())
    and (p_meeting_id is null or chunks.meeting_id = p_meeting_id)
    and chunks.embedding is not null
  order by chunks.embedding <=> p_query_embedding
  limit p_match_count;
end; $$;
revoke all on function public.match_meeting_document_chunks(vector, integer, uuid) from public;
grant execute on function public.match_meeting_document_chunks(vector, integer, uuid) to authenticated;
