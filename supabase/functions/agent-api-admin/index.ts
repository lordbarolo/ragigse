// Admin endpoint for managing agent API keys.
// Requires authenticated admin user.
// Actions: list, create, revoke

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { agentCors, jsonResponse, sha256Hex, adminClient } from "../_shared/agent-auth.ts";

async function requireAdmin(req: Request): Promise<{ userId: string } | { error: Response }> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "unauthorized" }, 401) };
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await sb.auth.getClaims(auth.slice(7));
  const userId = (data as any)?.claims?.sub;
  if (!userId) return { error: jsonResponse({ error: "unauthorized" }, 401) };

  const admin = adminClient();
  const { data: role } = await admin
    .from("ref_user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return { error: jsonResponse({ error: "forbidden" }, 403) };
  return { userId };
}

function randToken(prefix: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}${hex}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCors });

  const adminCheck = await requireAdmin(req);
  if ("error" in adminCheck) return adminCheck.error;
  const { userId } = adminCheck;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (req.method === "GET" ? "list" : "");
  const sb = adminClient();

  if (action === "list") {
    const { data, error } = await sb
      .from("agent_api_keys")
      .select("id, name, key_prefix, scopes, rate_limit_daily, created_at, last_used_at, revoked_at, notes")
      .order("created_at", { ascending: false });
    if (error) return jsonResponse({ error: "internal_error" }, 500);
    return jsonResponse({ keys: data });
  }

  if (action === "create" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s: any) => typeof s === "string") : [];
    const rateLimit = Number(body.rate_limit_daily) || 1000;
    const notes = body.notes ? String(body.notes).slice(0, 500) : null;
    if (!name) return jsonResponse({ error: "name_required" }, 400);
    if (scopes.length === 0) return jsonResponse({ error: "scopes_required" }, 400);

    const token = randToken("cck_");
    const hash = await sha256Hex(token);
    const prefix = token.slice(0, 12);

    const { data, error } = await sb
      .from("agent_api_keys")
      .insert({
        name,
        key_prefix: prefix,
        key_hash: hash,
        scopes,
        rate_limit_daily: rateLimit,
        notes,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) return jsonResponse({ error: "internal_error" }, 500);
    return jsonResponse({ id: data.id, token, key_prefix: prefix });
  }

  if (action === "revoke" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) return jsonResponse({ error: "id_required" }, 400);
    const { error } = await sb.from("agent_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return jsonResponse({ error: "internal_error" }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "unknown_action" }, 400);
});
