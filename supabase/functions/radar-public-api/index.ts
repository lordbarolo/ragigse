import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authenticateApiKey,
  clientIp,
  corsHeadersPublicApi as corsHeaders,
  enforceApiKeyRateLimit,
  extractApiKey,
  sha256Hex,
} from "../_shared/auth.ts";

const ALLOWED_ENDPOINTS = new Set([
  "predictions",
  "customer_intelligence",
  "calloff_imports",
]);

// Endpoints som stöder POST (write)
const WRITE_ENDPOINTS = new Set(["calloff_imports"]);


const API_VERSION = "1.1.0";

function queryId(): string {
  return crypto.randomUUID();
}

function envelope(opts: {
  capability: string;
  status: "success" | "error" | "partial";
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

// Tolerant validering av en calloff-rad. Returnerar { row, flags }.
// Saknar fält → flagga, men accepteras ändå om vi har minst datum eller kund.
function normalizeCalloff(input: unknown, partnerSource: string, shareData: boolean): { row: Record<string, unknown> | null; flags: string[] } {
  const flags: string[] = [];
  if (!input || typeof input !== "object") {
    return { row: null, flags: ["INVALID_SHAPE"] };
  }
  const r = input as Record<string, unknown>;

  const calloff_date = typeof r.calloff_date === "string" ? r.calloff_date : null;
  const customer = typeof r.customer === "string" ? r.customer.trim() : null;
  const region = typeof r.region === "string" ? r.region.trim() : null;
  const role = typeof r.role === "string" ? r.role.trim() : null;

  if (!calloff_date && !customer) {
    return { row: null, flags: ["MISSING_DATE_AND_CUSTOMER"] };
  }
  if (!calloff_date) flags.push("MISSING_DATE");
  if (!customer) flags.push("MISSING_CUSTOMER");
  if (!region) flags.push("MISSING_REGION");
  if (!role) flags.push("MISSING_ROLE");

  // Datumformat-check (YYYY-MM-DD)
  if (calloff_date && !/^\d{4}-\d{2}-\d{2}$/.test(calloff_date)) {
    flags.push("INVALID_DATE_FORMAT");
  }

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const row: Record<string, unknown> = {
    calloff_date: calloff_date && /^\d{4}-\d{2}-\d{2}$/.test(calloff_date) ? calloff_date : null,
    customer,
    region,
    role,
    specialization: typeof r.specialization === "string" ? r.specialization.trim() : null,
    customer_type: typeof r.customer_type === "string" ? r.customer_type : null,
    level: typeof r.level === "string" ? r.level : null,
    unit: typeof r.unit === "string" ? r.unit : null,
    duration_weeks: num(r.duration_weeks),
    price_min: num(r.price_min),
    price_median: num(r.price_median),
    price_max: num(r.price_max),
    filled: typeof r.filled === "boolean" ? r.filled : null,
    source: `partner:${partnerSource}`,
    partner_source: partnerSource,
    partner_share_data: shareData,
    raw_data: r,
    validation_flags: flags,
  };

  return { row, flags };
}

async function buildDedupHash(row: Record<string, unknown>): Promise<string> {
  const key = [
    row.partner_source ?? "",
    row.calloff_date ?? "",
    row.customer ?? "",
    row.region ?? "",
    row.role ?? "",
    row.specialization ?? "",
    row.price_median ?? "",
  ].join("|");
  return sha256Hex(key);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = clientIp(req);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);
  const url = new URL(req.url);

  // Path: /radar-public-api/<endpoint>
  const pathParts = url.pathname.split("/").filter(Boolean);
  const rawEndpoint = pathParts[pathParts.length - 1] ?? "";
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
              description: "Rådata från importerade avrop. Inkluderar partnerdata om partnern har share_data=true.",
              params: ["region", "role", "customer", "since", "limit", "offset"],
              scope: "calloff_imports",
            },
            {
              path: "/calloff_imports",
              method: "POST",
              description: "Skicka in egna avropsrader. Kräver can_write=true på API-nyckeln. Body: { rows: [...] }. Tolerant validering — ofullständiga rader flaggas men accepteras.",
              required_fields_recommended: ["calloff_date (YYYY-MM-DD)", "customer", "region", "role"],
              optional_fields: ["specialization", "level", "unit", "duration_weeks", "price_min", "price_median", "price_max", "customer_type", "filled"],
              dedup: "Rader dedupliceras per partner_source + datum + kund + region + roll + specialisering + pris",
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

  const apiKey = extractApiKey(req, url);

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

  const authRes = await authenticateApiKey(service, apiKey, endpoint, (code, message, status, meta) =>
    errorEnvelope(endpoint, code, message, status, meta),
  );
  if (!authRes.ok) return authRes.response;
  const keyRow = authRes.keyRow;

  const isWrite = req.method === "POST";

  if (isWrite && !WRITE_ENDPOINTS.has(endpoint)) {
    return errorEnvelope(endpoint, "WRITE_NOT_SUPPORTED", `Endpoint ${endpoint} does not support POST`, 405);
  }

  if (isWrite && !keyRow.can_write) {
    return errorEnvelope(endpoint, "WRITE_DENIED", "API key lacks write permission (can_write=false)", 403);
  }

  if (isWrite && !keyRow.partner_source) {
    return errorEnvelope(endpoint, "MISSING_PARTNER_SOURCE", "API key must have partner_source set to write data. Contact CompCare admin.", 403);
  }

  const rlRes = await enforceApiKeyRateLimit(service, keyRow, {
    endpoint, isWrite, ip, ua, method: req.method,
    envelopeError: (code, message, status, meta) => errorEnvelope(endpoint, code, message, status, meta),
  });
  if (!rlRes.ok) return rlRes.response;
  const { hourCount, dayCount, hourLimit, dayLimit } = rlRes;

  // ===== POST flow =====
  if (isWrite) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorEnvelope(endpoint, "INVALID_JSON", "Request body is not valid JSON", 400);
    }

    const rowsInput = (body as { rows?: unknown[] })?.rows;
    if (!Array.isArray(rowsInput) || rowsInput.length === 0) {
      return errorEnvelope(endpoint, "MISSING_ROWS", "Body must contain a non-empty 'rows' array", 400);
    }

    if (rowsInput.length > keyRow.max_write_rows_per_request) {
      return errorEnvelope(
        endpoint,
        "TOO_MANY_ROWS",
        `Max ${keyRow.max_write_rows_per_request} rows per request (received ${rowsInput.length})`,
        413,
      );
    }

    const accepted: Array<{ index: number; flags: string[]; dedup_hash: string }> = [];
    const rejected: Array<{ index: number; flags: string[] }> = [];
    const dupes: Array<{ index: number; reason: string }> = [];
    const insertRows: Record<string, unknown>[] = [];

    for (let i = 0; i < rowsInput.length; i++) {
      const { row, flags } = normalizeCalloff(rowsInput[i], keyRow.partner_source, keyRow.share_data);
      if (!row) {
        rejected.push({ index: i, flags });
        continue;
      }
      const dedup_hash = await buildDedupHash(row);
      row.dedup_hash = dedup_hash;
      insertRows.push(row);
      accepted.push({ index: i, flags, dedup_hash });
    }

    // Dedup: kolla befintliga hashes
    let inserted = 0;
    if (insertRows.length > 0) {
      const hashes = insertRows.map((r) => r.dedup_hash as string);
      const { data: existing } = await service
        .from("calloff_imports")
        .select("dedup_hash")
        .in("dedup_hash", hashes);
      const existingSet = new Set((existing ?? []).map((e: { dedup_hash: string }) => e.dedup_hash));

      const toInsert = insertRows.filter((r) => {
        const isDupe = existingSet.has(r.dedup_hash as string);
        if (isDupe) {
          const idx = accepted.findIndex((a) => a.dedup_hash === r.dedup_hash);
          if (idx !== -1) {
            dupes.push({ index: accepted[idx].index, reason: "duplicate_in_db" });
            accepted.splice(idx, 1);
          }
        }
        return !isDupe;
      });

      if (toInsert.length > 0) {
        const { error: insertErr, count } = await service
          .from("calloff_imports")
          .insert(toInsert, { count: "exact" });
        if (insertErr) {
          await service.from("radar_api_log").insert({
            api_key_id: keyRow.id, endpoint, query_params: { method: "POST", rows: rowsInput.length },
            row_count: 0, status: "error", client_ip: ip, user_agent: ua,
          });
          return errorEnvelope(endpoint, "INSERT_FAILED", insertErr.message, 500);
        }
        inserted = count ?? toInsert.length;
      }
    }

    const flagged = accepted.filter((a) => a.flags.length > 0);
    const status: "success" | "partial" =
      rejected.length === 0 && dupes.length === 0 ? "success" : "partial";

    // Log
    service.from("radar_api_log").insert({
      api_key_id: keyRow.id, endpoint,
      query_params: { method: "POST", received: rowsInput.length, inserted, dupes: dupes.length, rejected: rejected.length },
      row_count: inserted, status: status === "success" ? "write_success" : "write_partial",
      client_ip: ip, user_agent: ua,
    }).then(() => {}, () => {});
    service.from("radar_api_keys").update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id).then(() => {}, () => {});

    return jsonResponse(
      envelope({
        capability: endpoint,
        status,
        source: { name: "CompCare Uppdragsradar", version: API_VERSION, confidence: "high" },
        data: {
          received: rowsInput.length,
          inserted,
          duplicates: dupes.length,
          rejected: rejected.length,
          flagged: flagged.length,
          partner_source: keyRow.partner_source,
          share_data: keyRow.share_data,
          details: {
            duplicates: dupes,
            rejected,
            flagged: flagged.map((f) => ({ index: f.index, flags: f.flags })),
          },
        },
        meta: {
          endpoint,
          consumer: keyRow.name,
          rate_limit: {
            per_hour: hourLimit,
            per_day: dayLimit,
            remaining_hour: Math.max(0, hourLimit - (hourCount ?? 0) - 1),
            remaining_day: Math.max(0, dayLimit - (dayCount ?? 0) - 1),
          },
        },
      }),
    );
  }

  // ===== GET flow (oförändrad) =====
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
      const month = url.searchParams.get("month");
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
      const since = url.searchParams.get("since");
      Object.assign(queryParams, { region, role, customer, since });

      // Visa partnerns egna rader + alla rader som är delade publikt
      let q = service
        .from("calloff_imports")
        .select("id, customer, customer_type, region, role, specialization, level, unit, calloff_date, duration_weeks, price_min, price_median, price_max, filled, source, partner_source, imported_at", { count: "exact" })
        .order("calloff_date", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      // Filtrera: ingen partner-tagg ELLER egen partner-tagg ELLER partner_share_data=true
      if (keyRow.partner_source) {
        q = q.or(`partner_source.is.null,partner_source.eq.${keyRow.partner_source},partner_share_data.eq.true`);
      } else {
        q = q.or("partner_source.is.null,partner_share_data.eq.true");
      }

      if (region) q = q.eq("region", region);
      if (role) q = q.eq("role", role);
      if (customer) q = q.eq("customer", customer);
      if (since) q = q.gte("calloff_date", since);

      const { data, error, count } = await q;
      if (error) throw error;
      rows = data ?? [];
      total = count ?? null;
    }

    service.from("radar_api_log").insert({
      api_key_id: keyRow.id, endpoint, query_params: queryParams,
      row_count: rows.length, status: "success", client_ip: ip, user_agent: ua,
    }).then(() => {}, () => {});
    service.from("radar_api_keys").update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id).then(() => {}, () => {});

    return jsonResponse(
      envelope({
        capability: endpoint,
        status: "success",
        source: { name: "CompCare Uppdragsradar", version: API_VERSION, confidence: "high" },
        data: rows,
        pagination: { limit, offset, returned: rows.length, total },
        meta: {
          endpoint,
          consumer: keyRow.name,
          rate_limit: {
            per_hour: hourLimit,
            per_day: dayLimit,
            remaining_hour: Math.max(0, hourLimit - (hourCount ?? 0) - 1),
            remaining_day: Math.max(0, dayLimit - (dayCount ?? 0) - 1),
          },
        },
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[radar-public-api] error", msg);
    service.from("radar_api_log").insert({
      api_key_id: keyRow.id, endpoint, query_params: queryParams,
      row_count: 0, status: "error", client_ip: ip, user_agent: ua,
    }).then(() => {}, () => {});
    return errorEnvelope(endpoint, "INTERNAL_ERROR", msg, 500);
  }
});
