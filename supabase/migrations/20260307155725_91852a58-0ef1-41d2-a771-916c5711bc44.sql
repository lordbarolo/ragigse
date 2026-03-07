ALTER TABLE public.coupons ADD COLUMN max_uses integer NOT NULL DEFAULT 1;
ALTER TABLE public.coupons ADD COLUMN use_count integer NOT NULL DEFAULT 0;