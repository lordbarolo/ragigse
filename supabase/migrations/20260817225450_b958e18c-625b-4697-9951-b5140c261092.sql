CREATE TABLE public.cv_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cv_templates TO anon;
GRANT SELECT ON public.cv_templates TO authenticated;
GRANT ALL ON public.cv_templates TO service_role;

ALTER TABLE public.cv_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active cv templates"
ON public.cv_templates FOR SELECT
USING (is_active = true);

INSERT INTO public.cv_templates (slug, name, description, sort_order, design) VALUES
('klassisk', 'Klassisk', 'Serif-rubriker, tunn sektionslinje och generösa marginaler.', 1,
 '{"fontDocx":"Georgia","fontPdf":"times","accent":"1A1A1A","rule":"CCCCCC","margin":64,"body":10.5,"h1":19,"h2":13,"h3":11.5,"lineFactor":1.5,"uppercaseH2":false,"showRule":true}'::jsonb),
('modern', 'Modern', 'Sans-serif med accentfärg i rubriker och sektionslinjer.', 2,
 '{"fontDocx":"Calibri","fontPdf":"helvetica","accent":"534AB7","rule":"534AB7","margin":56,"body":10.5,"h1":21,"h2":12.5,"h3":11,"lineFactor":1.5,"uppercaseH2":true,"showRule":true}'::jsonb),
('kompakt', 'Kompakt', 'Tätare rytm och mindre grader för att få plats på färre sidor.', 3,
 '{"fontDocx":"Calibri","fontPdf":"helvetica","accent":"111111","rule":"DDDDDD","margin":44,"body":9.5,"h1":16,"h2":11,"h3":10,"lineFactor":1.3,"uppercaseH2":true,"showRule":false}'::jsonb);

ALTER TABLE public.cv_optimizations ADD COLUMN cv_template_slug text NOT NULL DEFAULT 'klassisk';

CREATE TRIGGER update_cv_templates_updated_at
BEFORE UPDATE ON public.cv_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();