import {
  corsHeadersUser as corsHeaders,
  enforceUserRateLimit,
  requireUserAuth,
} from "../_shared/auth.ts";

// Anti-scrape limits
const MAX_ROWS_PER_REQUEST = 25;
const RATE_LIMIT_PER_HOUR = 30;

const ALLOWED_ENDPOINTS = new Set(["predictions", "regions", "specializations"]);
const ALLOWED_HORIZONS = new Set([30, 60, 90]);
const ALLOWED_PROFESSIONS = new Set(["DOCTOR", "NURSE", "PHYSIOTHERAPIST"]);
const ALLOWED_CONFIDENCES = new Set(["low", "med", "high"]);

function monthsAhead(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  const cur = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cur <= end) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireUserAuth(req, { corsHeaders });
  if (!auth.ok) return auth.response;
  const { user, service, ip, ua } = auth.ctx;

  let endpoint = "";
  let filtersForLog: Record<string, unknown> = {};

  try {
    const body = await req.json().catch(() => ({}));
    endpoint = String(body?.endpoint ?? "");

    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Rate limit (per user, all endpoints combined) ---
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await service
      .from("radar_access_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      // Log the rate-limit hit too (so we can detect attack patterns)
      await service.from("radar_access_log").insert({
        user_id: user.id, endpoint, filters: { rate_limited: true },
        row_count: 0, client_ip: ip, user_agent: ua.slice(0, 200), status: "rate_limited",
      });
      return new Response(JSON.stringify({
        error: `Rate limit exceeded: max ${RATE_LIMIT_PER_HOUR} requests per hour`,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rows: unknown[] = [];

    // --- ENDPOINT: predictions (top-N filtered prognoses) ---
    if (endpoint === "predictions") {
      const horizon = Number(body?.horizon ?? 30);
      if (!ALLOWED_HORIZONS.has(horizon)) {
        return new Response(JSON.stringify({ error: "Invalid horizon" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const region = typeof body?.region === "string" && body.region.length > 0 && body.region.length <= 100
        ? body.region : null;
      const profession = typeof body?.profession === "string" && ALLOWED_PROFESSIONS.has(body.profession)
        ? body.profession : null;
      const specialization = typeof body?.specialization === "string" && body.specialization.length > 0 && body.specialization.length <= 100
        ? body.specialization : null;
      const onlyHigh = body?.only_high_confidence === true;

      filtersForLog = { horizon, region, profession, specialization, onlyHigh };

      const months = monthsAhead(horizon);
      let q = service
        .from("uppdragsradar_predictions")
        .select("id, customer, region, profession, specialization, month, expected_calloffs, expected_calloffs_display, confidence, is_seasonal_peak, is_trend_break, trend_ratio")
        .in("month", months)
        .order("expected_calloffs", { ascending: false })
        .limit(MAX_ROWS_PER_REQUEST);

      if (region) q = q.eq("region", region);
      if (profession) q = q.eq("profession", profession);
      if (specialization) q = q.eq("specialization", specialization);
      if (onlyHigh) q = q.eq("confidence", "high");

      const { data, error } = await q;
      if (error) throw error;
      rows = data ?? [];
    }

    // --- ENDPOINT: regions (distinct list — small, capped) ---
    else if (endpoint === "regions") {
      filtersForLog = {};
      // Fetch a capped set; distinct done in JS (Supabase JS lacks DISTINCT)
      const { data, error } = await service
        .from("uppdragsradar_predictions")
        .select("region")
        .not("region", "is", null)
        .limit(2000);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: { region: string | null }) => { if (r.region) set.add(r.region); });
      rows = Array.from(set).sort().map((region) => ({ region }));
    }

    // --- ENDPOINT: specializations (distinct per profession, capped) ---
    else if (endpoint === "specializations") {
      const profession = typeof body?.profession === "string" && ALLOWED_PROFESSIONS.has(body.profession)
        ? body.profession : null;
      if (!profession) {
        return new Response(JSON.stringify({ error: "profession required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      filtersForLog = { profession };
      const { data, error } = await service
        .from("uppdragsradar_predictions")
        .select("specialization")
        .eq("profession", profession)
        .not("specialization", "is", null)
        .limit(2000);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: { specialization: string | null }) => {
        if (r.specialization) set.add(r.specialization);
      });
      rows = Array.from(set).sort().map((specialization) => ({ specialization }));
    }

    // --- Log success ---
    await service.from("radar_access_log").insert({
      user_id: user.id, endpoint, filters: filtersForLog,
      row_count: rows.length, client_ip: ip, user_agent: ua.slice(0, 200), status: "success",
    });

    return new Response(JSON.stringify({ rows, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[radar-data] error", msg);
    await service.from("radar_access_log").insert({
      user_id: user.id, endpoint: endpoint || "unknown", filters: filtersForLog,
      row_count: 0, client_ip: ip, user_agent: ua.slice(0, 200), status: "error",
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
