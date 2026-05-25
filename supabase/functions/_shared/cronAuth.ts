// Shared guard for edge functions that are invoked by pg_cron (or admins).
// Blocks public/anon callers by requiring either:
//   - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  (cron jobs via Vault), or
//   - an authenticated admin user (ref_user_roles.role = 'admin').
//
// Use at the very top of cron-triggered edge functions instead of relying on
// `verify_jwt = false` + no internal check.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function unauthorized(msg = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Returns null on success, or a Response (401/403) to short-circuit the handler.
 * Pass-through OPTIONS requests must be handled BEFORE calling this.
 */
export async function requireCronOrAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return unauthorized();

  const token = authHeader.slice("Bearer ".length).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  // Fast path: cron / internal caller using service role from Vault.
  if (serviceKey && token === serviceKey) return null;

  // Otherwise: must be an authenticated admin user.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return unauthorized();

  const svc = createClient(supabaseUrl, serviceKey);
  const { data: role } = await svc
    .from("ref_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!role) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}
