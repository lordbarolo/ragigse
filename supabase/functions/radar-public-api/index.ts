import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ALLOWED_ENDPOINTS = new Set([
  "predictions",
  "customer_intelligence",
  "calloff_imports",
]);

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    null
  );
}

const API_VERSION = "1.0.0";

function queryId(): string {
  return crypto.randomUUID();
}

function envelope(opts: {
  capability: string;
  status: "success" | "error";
  data?: unknown;
  source?: { name: string; version: string; confidence: string } | null;
  policy?: Record<string, unknown>;
  errors?: Array<{ code: string; message: string }>;
  pagination?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}) {
  return {
    query_id: queryId(),
    capability: opts.capability,
    status: opts.status,
    data: opts.data ?? null,
    source: opts.source ?? null,
    policy: opts.policy ?? { status: opts.status === "success" ? "allowed" : "blocked" },
    errors: opts.errors ?? [],
    pagination: opts.pagination,
    meta: { api_version: API_VERSION, ...(opts.meta ?? {}) },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorEnvelope(
  capability: string,
  code: string,
  message: string,
  httpStatus: number,
  meta: Record<string, unknown> = {},
): Response {
  return jsonResponse(
    envelope({
      capability,
      status: "error",
      policy: { status: "blocked", code },
      errors: [{ code, message }],
      meta,
    }),
    httpStatus,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = clientIp(req);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);
  const url = new URL(req.url);

  // Path: /radar-public-api/<endpoint>
  const pathParts = url.pathname.split("/").filter(Boolean);
  const rawEndpoint = pathParts[pathParts.length - 1] ?? "";
  // If the last segment is the function name itself, treat as discovery root
  const endpoint =
    rawEndpoint === "radar-public-api" || rawEndpoint === "" ? "" : rawEndpoint;

  // Discovery root — returns capabilities, no auth required
  if (!endpoint) {
    return jsonResponse(
      envelope({
        capability: "discover",
        status: "success",
        source: { name: "CompCare Uppdragsradar", version: API_VERSION, confidence: "high" },
        data: {
          api: "Uppdragsradar Public API",
          version: API_VERSION,
          base_url: `${url.origin}/functions/v1/radar-public-api`,
          authentication: {
            methods: ["X-API-Key header", "Authorization: Bearer", "?api_key= query"],
            issued_by: "CompCare admin (per consumer)",
          },
          endpoints: [
            {
              path: "/predictions",
              method: "GET",
              description: "Avropsprediktioner per kund/region/profession/månad",
              params: ["region", "profession", "specialization", "month", "confidence", "limit", "offset"],
              scope: "predictions",
            },
            {
              path: "/customer_intelligence",
              method: "GET",
              description: "Trender och säsongstoppar per kund",
              params: ["customer", "region", "profession", "limit", "offset"],
              scope: "customer_intelligence",
            },
            {
              path: "/calloff_imports",
              method: "GET",
              description: "Rådata från importerade avrop",
              params: ["region", "role", "customer", "since", "limit", "offset"],
              scope: "calloff_imports",
            },
          ],
          envelope: {
            description: "All responses follow CompCare CI envelope",
            fields: ["query_id", "capability", "status", "data", "source", "policy", "errors", "pagination", "meta"],
          },
          documentation: "https://compcare.se/radar-api-README.md",
          openapi: "https://compcare.se/openapi.json",
        },
      }),
      200,
    );
  }

  const apiKey =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("api_key") ??
    "";

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!apiKey) {
    return errorEnvelope(endpoint, "MISSING_API_KEY", "Missing API key. Send via X-API-Key header.", 401);
  }

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return errorEnvelope(endpoint, "UNKNOWN_ENDPOINT", `Unknown endpoint. Available: ${[...ALLOWED_ENDPOINTS].join(", ")}`, 404);
  }

  // Verify key
  const keyHash = await sha256Hex(apiKey);
  const { data: keyRow } = await service
    .from("radar_api_keys")
    .select("id, name, scopes, rate_limit_per_hour, rate_limit_per_day, max_rows_per_request, is_active, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!keyRow || !keyRow.is_active || keyRow.revoked_at) {
    return jsonResponse({ error: "Invalid or revoked API key" }, 401);
  }

  if (!keyRow.scopes.includes(endpoint)) {
    return jsonResponse({ error: `API key lacks scope: ${endpoint}` }, 403);
  }

  // Rate limit check
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
    service.from("radar_api_log").select("id", { count: "exact", head: true })
      .eq("api_key_id", keyRow.id).gte("created_at", oneHourAgo),
    service.from("radar_api_log").select("id", { count: "exact", head: true })
      .eq("api_key_id", keyRow.id).gte("created_at", oneDayAgo),
  ]);

  if ((hourCount ?? 0) >= keyRow.rate_limit_per_hour) {
    await service.from("radar_api_log").insert({
      api_key_id: keyRow.id, endpoint, query_params: {},
      row_count: 0, status: "rate_limited_hour", client_ip: ip, user_agent: ua,
    });
    return jsonResponse({
      error: "Hourly rate limit exceeded",
      limit: keyRow.rate_limit_per_hour,
    }, 429);
  }

  if ((dayCount ?? 0) >= keyRow.rate_limit_per_day) {
    await service.from("radar_api_log").insert({
      api_key_id: keyRow.id, endpoint, query_params: {},
      row_count: 0, status: "rate_limited_day", client_ip: ip, user_agent: ua,
    });
    return jsonResponse({
      error: "Daily rate limit exceeded",
      limit: keyRow.rate_limit_per_day,
    }, 429);
  }

  // Parse pagination/filter params
  const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.min(
    Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 50),
    keyRow.max_rows_per_request,
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"));

  const queryParams: Record<string, unknown> = { limit, offset };

  try {
    let rows: unknown[] = [];
    let total: number | null = null;

    if (endpoint === "predictions") {
      const region = url.searchParams.get("region");
      const profession = url.searchParams.get("profession");
      const specialization = url.searchParams.get("specialization");
      const month = url.searchParams.get("month"); // YYYY-MM
      const confidence = url.searchParams.get("confidence");
      Object.assign(queryParams, { region, profession, specialization, month, confidence });

      let q = service
        .from("uppdragsradar_predictions")
        .select("id, customer, region, profession, specialization, month, expected_calloffs, expected_calloffs_display, confidence, is_seasonal_peak, is_trend_break, trend_ratio", { count: "exact" })
        .order("month", { ascending: true })
        .order("expected_calloffs", { ascending: false })
        .range(offset, offset + limit - 1);

      if (region) q = q.eq("region", region);
      if (profession) q = q.eq("profession", profession);
      if (specialization) q = q.eq("specialization", specialization);
      if (month) q = q.eq("month", month);
      if (confidence) q = q.eq("confidence", confidence);

      const { data, error, count } = await q;
      if (error) throw error;
      rows = data ?? [];
      total = count ?? null;
    } else if (endpoint === "customer_intelligence") {
      const customer = url.searchParams.get("customer");
      const region = url.searchParams.get("region");
      const profession = url.searchParams.get("profession");
      Object.assign(queryParams, { customer, region, profession });

      let q = service
        .from("customer_intelligence")
        .select("id, customer, region, profession, last_calloff_date, vol_2023, vol_2024, vol_2025, vol_2026_ytd, yoy_ratio, ytd_ratio, trend_ratio, trend_label, seasonal_peaks, seasonal_lows, history_months, generated_at", { count: "exact" })
        .order("generated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (customer) q = q.eq("customer", customer);
      if (region) q = q.eq("region", region);
      if (profession) q = q.eq("profession", profession);

      const { data, error, count } = await q;
      if (error) throw error;
      rows = data ?? [];
      total = count ?? null;
    } else if (endpoint === "calloff_imports") {
      const region = url.searchParams.get("region");
      const role = url.searchParams.get("role");
      const customer = url.searchParams.get("customer");
      const since = url.searchParams.get("since"); // YYYY-MM-DD
      Object.assign(queryParams, { region, role, customer, since });

      let q = service
        .from("calloff_imports")
        .select("id, customer, customer_type, region, role, specialization, level, unit, calloff_date, duration_weeks, price_min, price_median, price_max, filled, source, imported_at", { count: "exact" })
        .order("calloff_date", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (region) q = q.eq("region", region);
      if (role) q = q.eq("role", role);
      if (customer) q = q.eq("customer", customer);
      if (since) q = q.gte("calloff_date", since);

      const { data, error, count } = await q;
      if (error) throw error;
      rows = data ?? [];
      total = count ?? null;
    }

    // Log success + update last_used_at (fire-and-forget)
    service.from("radar_api_log").insert({
      api_key_id: keyRow.id, endpoint, query_params: queryParams,
      row_count: rows.length, status: "success", client_ip: ip, user_agent: ua,
    }).then(() => {}, () => {});
    service.from("radar_api_keys").update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id).then(() => {}, () => {});

    return jsonResponse({
      data: rows,
      pagination: { limit, offset, returned: rows.length, total },
      meta: {
        endpoint,
        consumer: keyRow.name,
        rate_limit: {
          per_hour: keyRow.rate_limit_per_hour,
          per_day: keyRow.rate_limit_per_day,
          remaining_hour: Math.max(0, keyRow.rate_limit_per_hour - (hourCount ?? 0) - 1),
          remaining_day: Math.max(0, keyRow.rate_limit_per_day - (dayCount ?? 0) - 1),
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[radar-public-api] error", msg);
    service.from("radar_api_log").insert({
      api_key_id: keyRow.id, endpoint, query_params: queryParams,
      row_count: 0, status: "error", client_ip: ip, user_agent: ua,
    }).then(() => {}, () => {});
    return jsonResponse({ error: msg }, 500);
  }
});
