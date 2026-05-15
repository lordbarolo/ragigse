// GET /agent-api-market-history?role=Sjuksköterska&region=Stockholm&months_back=12
// Returns aggregated historical calloff data. No PII, no individual customer names unless partner_share_data=true.
// Scope: market:read

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  agentCors,
  authenticateAgentRequest,
  jsonResponse,
  logAgentCall,
  adminClient,
} from "../_shared/agent-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCors });
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  const start = Date.now();
  const url = new URL(req.url);
  const role = url.searchParams.get("role")?.trim();
  const region = url.searchParams.get("region")?.trim();
  const monthsBackRaw = parseInt(url.searchParams.get("months_back") || "12", 10);
  const monthsBack = Math.max(1, Math.min(24, isNaN(monthsBackRaw) ? 12 : monthsBackRaw));
  const params = { role, region, months_back: monthsBack };

  const authResult = await authenticateAgentRequest(req, "market:read");
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  if (!role) {
    const r = jsonResponse({ error: "missing_param", param: "role" }, 400);
    await logAgentCall(ctx, req, "agent-api-market-history", 400, start, params);
    return r;
  }

  try {
    const sb = adminClient();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);

    let q = sb
      .from("calloff_imports")
      .select("calloff_date, region, role, customer_type, price_median, price_min, price_max, partner_share_data")
      .gte("calloff_date", cutoff.toISOString().slice(0, 10))
      .ilike("role", `%${role}%`)
      .not("calloff_date", "is", null);

    if (region) q = q.ilike("region", `%${region}%`);

    const { data: rows, error } = await q.limit(5000);
    if (error) {
      await logAgentCall(ctx, req, "agent-api-market-history", 500, start, params, undefined, error.message);
      return jsonResponse({ error: "query_failed" }, 500);
    }

    // Aggregate by year-month
    const monthly = new Map<string, { count: number; prices: number[]; types: Set<string> }>();
    for (const r of rows || []) {
      const ym = String(r.calloff_date).slice(0, 7);
      const entry = monthly.get(ym) || { count: 0, prices: [], types: new Set() };
      entry.count++;
      if (r.price_median) entry.prices.push(Number(r.price_median));
      if (r.customer_type) entry.types.add(r.customer_type);
      monthly.set(ym, entry);
    }

    const series = Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, e]) => ({
        month,
        calloff_count: e.count,
        median_price_sek: e.prices.length
          ? Math.round(e.prices.sort((a, b) => a - b)[Math.floor(e.prices.length / 2)])
          : null,
        customer_types: Array.from(e.types),
      }));

    const payload = {
      role_query: role,
      region_query: region,
      months_back: monthsBack,
      total_calloffs: rows?.length ?? 0,
      monthly_series: series,
      disclaimer:
        "Historical data only. No forward-looking predictions. Customer names not exposed; only aggregated counts and price medians.",
    };
    const body = JSON.stringify(payload);
    await logAgentCall(ctx, req, "agent-api-market-history", 200, start, params, body.length);
    return new Response(body, {
      status: 200,
      headers: { ...agentCors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await logAgentCall(ctx, req, "agent-api-market-history", 500, start, params, undefined, msg);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
