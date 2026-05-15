// Shared helper for Agent API endpoints.
// Validates API keys / user tokens, enforces scopes + rate limits, logs every call.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const agentCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...agentCors, "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export interface AuthContext {
  type: "api_key" | "user_token";
  api_key_id?: string;
  user_token_id?: string;
  user_id?: string;
  scopes: string[];
  rate_limit_daily: number;
}

/**
 * Extract bearer token; look up in agent_api_keys or agent_user_tokens.
 * Returns AuthContext or a Response with the appropriate error.
 */
export async function authenticateAgentRequest(
  req: Request,
  requiredScope: string | null,
): Promise<{ ctx: AuthContext } | { error: Response }> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "unauthorized", message: "Bearer token required" }, 401) };
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return { error: jsonResponse({ error: "unauthorized", message: "Empty token" }, 401) };
  }

  const hash = await sha256Hex(token);
  const sb = admin();

  // Try API key first (prefix cck_)
  if (token.startsWith("cck_")) {
    const { data: key, error } = await sb
      .from("agent_api_keys")
      .select("id, scopes, rate_limit_daily, revoked_at")
      .eq("key_hash", hash)
      .maybeSingle();
    if (error || !key) {
      return { error: jsonResponse({ error: "invalid_key" }, 401) };
    }
    if (key.revoked_at) {
      return { error: jsonResponse({ error: "key_revoked" }, 401) };
    }
    if (requiredScope && !(key.scopes || []).includes(requiredScope)) {
      return { error: jsonResponse({ error: "insufficient_scope", required: requiredScope }, 403) };
    }
    // Rate limit check
    const { data: countData } = await sb.rpc("agent_api_count_today", { _key_id: key.id });
    const used = (countData as number) ?? 0;
    if (used >= key.rate_limit_daily) {
      return {
        error: jsonResponse(
          { error: "rate_limited", limit: key.rate_limit_daily, used },
          429,
          { "X-RateLimit-Limit": String(key.rate_limit_daily), "X-RateLimit-Remaining": "0" },
        ),
      };
    }
    // Touch last_used_at (fire-and-forget)
    sb.from("agent_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id).then();
    return {
      ctx: {
        type: "api_key",
        api_key_id: key.id,
        scopes: key.scopes || [],
        rate_limit_daily: key.rate_limit_daily,
      },
    };
  }

  // User token (prefix cut_)
  if (token.startsWith("cut_")) {
    const { data: ut, error } = await sb
      .from("agent_user_tokens")
      .select("id, user_id, expires_at, revoked_at")
      .eq("token_hash", hash)
      .maybeSingle();
    if (error || !ut) {
      return { error: jsonResponse({ error: "invalid_token" }, 401) };
    }
    if (ut.revoked_at || new Date(ut.expires_at) < new Date()) {
      return { error: jsonResponse({ error: "token_expired_or_revoked" }, 401) };
    }
    sb.from("agent_user_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", ut.id).then();
    return {
      ctx: {
        type: "user_token",
        user_token_id: ut.id,
        user_id: ut.user_id,
        scopes: ["user:read"],
        rate_limit_daily: 1000,
      },
    };
  }

  return { error: jsonResponse({ error: "invalid_token_format" }, 401) };
}

export async function logAgentCall(
  ctx: AuthContext,
  req: Request,
  endpoint: string,
  status: number,
  startMs: number,
  params: Record<string, unknown>,
  responseSize?: number,
  errorMessage?: string,
) {
  try {
    const sb = admin();
    await sb.from("agent_api_logs").insert({
      api_key_id: ctx.api_key_id ?? null,
      user_token_id: ctx.user_token_id ?? null,
      endpoint,
      method: req.method,
      status_code: status,
      latency_ms: Date.now() - startMs,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) || null,
      params,
      response_size_bytes: responseSize ?? null,
      error_message: errorMessage ?? null,
    });
  } catch (e) {
    console.error("[agent-auth] log failed:", e);
  }
}

export function adminClient() {
  return admin();
}
