INSERT INTO public.invoice_reviews (
  id,
  user_id,
  faktura_path,
  tidrapport_path,
  grundpris,
  yrkeskategori,
  is_handwritten,
  status,
  terms_accepted_at
) VALUES (
  'e2e00001-0001-0001-0001-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'test-e2e/faktura_test.pdf',
  'test-e2e/faktura_test.pdf',
  1401.65,
  'Legitimerad läkare',
  false,
  'pending',
  now()
);