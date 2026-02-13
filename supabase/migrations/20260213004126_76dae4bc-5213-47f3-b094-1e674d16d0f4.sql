
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  yrke TEXT,
  kommun TEXT,
  experience INTEGER,
  salary_type TEXT,
  current_salary INTEGER,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (no auth required for lead capture)
CREATE POLICY "Anyone can insert leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Allow anonymous updates by id (to update survey progress)
CREATE POLICY "Anyone can update leads by id"
ON public.leads
FOR UPDATE
USING (true)
WITH CHECK (true);

-- No select/delete for anonymous users
CREATE POLICY "No public reads"
ON public.leads
FOR SELECT
USING (false);
