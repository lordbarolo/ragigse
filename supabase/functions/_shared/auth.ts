// Shared auth + rate-limit helpers for radar-* edge functions.
// Extracted verbatim from radar-data (JWT flow) and radar-public-api (API-key flow)
// so behavior across all radar endpoints stays byte-compatible for authorized callers.

import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- CORS ----------

export const corsHeadersUser: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const corsHeadersPublicApi: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ---------- Small helpers ----------

// Same UA blacklist as radar-data.
export const SUSPICIOUS_UA =
  /(curl|wget|python-requests|scrapy|httpx|axios\/|node-fetch|bot|spider|crawler)/i;

export function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    null
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// =====================================================================
// USER (JWT) AUTH — used by radar-data + radar-predictions
// =====================================================================

export interface UserAuthContext {
  user: User;
  service: SupabaseClient;
  ip: string | null;
  ua: string;
}

export type UserAuthResult =
  | { ok: true; ctx: UserAuthContext }
  | { ok: false; response: Response };

/**
 * Mirrors radar-data's original auth block:
 *  - Optional suspicious-UA block (403 "Forbidden")
 *  - Require Authorization: Bearer <jwt> (401 "Unauthorized")
 *  - Validate via anon client + auth.getUser() (401 "Unauthorized")
 *  - Return { user, service (service-role), ip, ua }
 */
export async function requireUserAuth(
  req: Request,
  opts: { corsHeaders?: Record<string, string>; blockSuspiciousUa?: boolean } = {},
): Promise<UserAuthResult> {
  const corsHeaders = opts.corsHeaders ?? corsHeadersUser;
  const blockSuspiciousUa = opts.blockSuspiciousUa ?? true;

  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? "";

  if (blockSuspiciousUa && SUSPICIOUS_UA.test(ua)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  return { ok: true, ctx: { user, service, ip, ua } };
}

/**
 * Mirrors radar-data's rate-limit block:
 *  - Count radar_access_log rows for user_id in last hour
 *  - If >= limit, insert a "rate_limited" log row and return 429 with the
 *    exact same body string radar-data used.
 *  - Otherwise return null (caller proceeds).
 */
export async function enforceUserRateLimit(
  service: SupabaseClient,
  user: User,
  endpoint: string,
  opts: {
    ip: string | null;
    ua: string;
    limitPerHour: number;
    filters?: Record<string, unknown>;
    corsHeaders?: Record<string, string>;
  },
): Promise<Response | null> {
  const corsHeaders = opts.corsHeaders ?? corsHeadersUser;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: recentCount } = await service
    .from("radar_access_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= opts.limitPerHour) {
    await service.from("radar_access_log").insert({
      user_id: user.id,
      endpoint,
      filters: { ...(opts.filters ?? {}), rate_limited: true },
      row_count: 0,
      client_ip: opts.ip,
      user_agent: (opts.ua ?? "").slice(0, 200),
      status: "rate_limited",
    });
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded: max ${opts.limitPerHour} requests per hour`,
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  return null;
}

// =====================================================================
// API-KEY AUTH — used by radar-public-api
// =====================================================================

export interface RadarApiKey {
  id: string;
  name: string;
  scopes: string[];
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  max_rows_per_request: number;
  is_active: boolean;
  revoked_at: string | null;
  can_write: boolean;
  write_per_hour: number;
  write_per_day: number;
  max_write_rows_per_request: number;
  share_data: boolean;
  partner_source: string | null;
}

// Envelope-error factory the caller owns (keeps envelope shape out of the shared module).
export type EnvelopeErrorFn = (
  code: string,
  message: string,
  httpStatus: number,
  meta?: Record<string, unknown>,
) => Response;

export function extractApiKey(req: Request, url: URL): string {
  return (
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("api_key") ??
    ""
  );
}

/**
 * Mirrors radar-public-api key verification + scope check.
 * Returns the raw key row on success, or the envelope-shaped error Response
 * the public API expects.
 */
export async function authenticateApiKey(
  service: SupabaseClient,
  apiKey: string,
  endpoint: string,
  envelopeError: EnvelopeErrorFn,
): Promise<{ ok: true; keyRow: RadarApiKey } | { ok: false; response: Response }> {
  if (!apiKey) {
    return {
      ok: false,
      response: envelopeError(
        "MISSING_API_KEY",
        "Missing API key. Send via X-API-Key header.",
        401,
      ),
    };
  }

  const keyHash = await sha256Hex(apiKey);
  const { data: keyRow } = await service
    .from("radar_api_keys")
    .select(
      "id, name, scopes, rate_limit_per_hour, rate_limit_per_day, max_rows_per_request, is_active, revoked_at, can_write, write_per_hour, write_per_day, max_write_rows_per_request, share_data, partner_source",
    )
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!keyRow || !keyRow.is_active || keyRow.revoked_at) {
    return {
      ok: false,
      response: envelopeError("INVALID_API_KEY", "Invalid or revoked API key", 401),
    };
  }

  if (!keyRow.scopes.includes(endpoint)) {
    return {
      ok: false,
      response: envelopeError("SCOPE_DENIED", `API key lacks scope: ${endpoint}`, 403),
    };
  }

  return { ok: true, keyRow: keyRow as RadarApiKey };
}

/**
 * Mirrors radar-public-api rate-limit block for both read and write.
 * On breach: inserts the same rate-limit log row and returns the same envelope error.
 * On success: returns counts + limits so callers can build the response `meta.rate_limit`.
 */
export async function enforceApiKeyRateLimit(
  service: SupabaseClient,
  keyRow: RadarApiKey,
  opts: {
    endpoint: string;
    isWrite: boolean;
    ip: string | null;
    ua: string;
    method: string;
    envelopeError: EnvelopeErrorFn;
  },
): Promise<
  | {
      ok: true;
      hourCount: number;
      dayCount: number;
      hourLimit: number;
      dayLimit: number;
    }
  | { ok: false; response: Response }
> {
  const { endpoint, isWrite, ip, ua, method, envelopeError } = opts;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const writeStatuses = ["write_success", "write_partial"];
  const readStatuses = ["success", "rate_limited_hour", "rate_limited_day", "error"];
  const statusFilter = isWrite ? writeStatuses : readStatuses;

  const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
    service
      .from("radar_api_log")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", keyRow.id)
      .gte("created_at", oneHourAgo)
      .in("status", statusFilter),
    service
      .from("radar_api_log")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", keyRow.id)
      .gte("created_at", oneDayAgo)
      .in("status", statusFilter),
  ]);

  const hourLimit = isWrite ? keyRow.write_per_hour : keyRow.rate_limit_per_hour;
  const dayLimit = isWrite ? keyRow.write_per_day : keyRow.rate_limit_per_day;

  if ((hourCount ?? 0) >= hourLimit) {
    await service.from("radar_api_log").insert({
      api_key_id: keyRow.id,
      endpoint,
      query_params: { method },
      row_count: 0,
      status: "rate_limited_hour",
      client_ip: ip,
      user_agent: ua,
    });
    return {
      ok: false,
      response: envelopeError(
        "RATE_LIMITED_HOUR",
        `Hourly rate limit exceeded (${hourLimit})`,
        429,
        {
          consumer: keyRow.name,
          rate_limit: { per_hour: hourLimit, per_day: dayLimit },
        },
      ),
    };
  }

  if ((dayCount ?? 0) >= dayLimit) {
    await service.from("radar_api_log").insert({
      api_key_id: keyRow.id,
      endpoint,
      query_params: { method },
      row_count: 0,
      status: "rate_limited_day",
      client_ip: ip,
      user_agent: ua,
    });
    return {
      ok: false,
      response: envelopeError(
        "RATE_LIMITED_DAY",
        `Daily rate limit exceeded (${dayLimit})`,
        429,
        {
          consumer: keyRow.name,
          rate_limit: { per_hour: hourLimit, per_day: dayLimit },
        },
      ),
    };
  }

  return {
    ok: true,
    hourCount: hourCount ?? 0,
    dayCount: dayCount ?? 0,
    hourLimit,
    dayLimit,
  };
}
