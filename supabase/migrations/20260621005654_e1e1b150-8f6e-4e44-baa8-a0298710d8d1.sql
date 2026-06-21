
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.lonekoll_avtal_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_doc TEXT NOT NULL,
  section TEXT,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.lonekoll_avtal_chunks TO service_role;

ALTER TABLE public.lonekoll_avtal_chunks ENABLE ROW LEVEL SECURITY;

CREATE INDEX lonekoll_avtal_chunks_embedding_idx
  ON public.lonekoll_avtal_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_lonekoll_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  source_doc TEXT,
  section TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.source_doc,
    c.section,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.lonekoll_avtal_chunks c
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_lonekoll_chunks(vector, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_lonekoll_chunks(vector, int) TO service_role;
