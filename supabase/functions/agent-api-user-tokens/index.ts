// Authenticated user endpoint: manage own agent-access tokens.
// Actions: list, create, revoke

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { agentCors, jsonResponse, sha256Hex, adminClient } from "../_shared/agent-auth.ts";

async function requireUser(req: Request): Promise<{ userId: string } | { error: Response }> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return { error: jsonResponse({ error: "unauthorized" }, 401) };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await sb.auth.getClaims(auth.slice(7));
  const userId = (data as any)?.claims?.sub;
  if (!userId) return { error: jsonResponse({ error: "unauthorized" }, 401) };
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

  const userCheck = await requireUser(req);
  if ("error" in userCheck) return userCheck.error;
  const { userId } = userCheck;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (req.method === "GET" ? "list" : "");
  const sb = adminClient();

  if (action === "list") {
    const { data, error } = await sb
      .from("agent_user_tokens")
      .select("id, label, token_prefix, expires_at, created_at, last_used_at, revoked_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ tokens: data });
  }

  if (action === "create" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const label = String(body.label || "").trim();
    const ttlDays = Math.max(1, Math.min(365, Number(body.ttl_days) || 30));
    if (!label) return jsonResponse({ error: "label_required" }, 400);

    const token = randToken("cut_");
    const hash = await sha256Hex(token);
    const prefix = token.slice(0, 12);
    const expiresAt = new Date(Date.now() + ttlDays * 86400_000).toISOString();

    const { data, error } = await sb
      .from("agent_user_tokens")
      .insert({ user_id: userId, label, token_prefix: prefix, token_hash: hash, expires_at: expiresAt })
      .select("id, expires_at")
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ id: data.id, token, token_prefix: prefix, expires_at: data.expires_at });
  }

  if (action === "revoke" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!id) return jsonResponse({ error: "id_required" }, 400);
    const { error } = await sb
      .from("agent_user_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "unknown_action" }, 400);
});
