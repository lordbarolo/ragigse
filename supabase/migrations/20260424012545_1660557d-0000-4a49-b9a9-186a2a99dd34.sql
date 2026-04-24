
-- Sätt security_invoker så vyn använder den frågande användarens RLS, inte definer's
ALTER VIEW public.calloff_imports_public SET (security_invoker = true);
