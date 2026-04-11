
-- Table: invoice_reviews
CREATE TABLE public.invoice_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Uploaded file paths (Supabase Storage)
  faktura_path TEXT,
  tidrapport_path TEXT,
  kontrakt_path TEXT,
  
  -- Extracted data (JSON from Claude)
  faktura_data JSONB,
  tidrapport_data JSONB,
  kontrakt_data JSONB,
  
  -- Analysis results
  avvikelser JSONB,
  forvantad_summa NUMERIC,
  fakturerad_summa NUMERIC,
  differens NUMERIC,
  
  -- Status flags
  har_avvikelse BOOLEAN NOT NULL DEFAULT false,
  notis_skickad BOOLEAN NOT NULL DEFAULT false,
  konsult_godkand BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_invoice_reviews_user_id ON public.invoice_reviews(user_id, created_at DESC);
CREATE INDEX idx_invoice_reviews_avvikelse ON public.invoice_reviews(har_avvikelse) WHERE har_avvikelse = true;

-- RLS
ALTER TABLE public.invoice_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews"
  ON public.invoice_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reviews"
  ON public.invoice_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reviews"
  ON public.invoice_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for invoice review files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('invoice_reviews', 'invoice_reviews', false, 10485760);

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload invoice files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoice_reviews' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own invoice files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoice_reviews' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Service role can read all files (for Edge Function)
CREATE POLICY "Service role can read all invoice files"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'invoice_reviews');
