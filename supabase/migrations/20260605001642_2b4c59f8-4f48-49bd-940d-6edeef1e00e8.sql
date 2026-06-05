-- Fix exposed sensitive token columns flagged by security scan
-- These columns should never be readable by client roles (authenticated/anon)
-- Tokens are only needed by edge functions (service_role) and SECURITY DEFINER RPCs

-- 1. ref_pings.response_token
REVOKE SELECT (response_token) ON public.ref_pings FROM authenticated;
REVOKE SELECT (response_token) ON public.ref_pings FROM anon;

-- 2. ref_references.invite_token
REVOKE SELECT (invite_token) ON public.ref_references FROM authenticated;
REVOKE SELECT (invite_token) ON public.ref_references FROM anon;