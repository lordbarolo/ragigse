// Refresh Uppdragsradar forecast — runs weekly via pg_cron.
// Reads aggregated monthly volumes from calloff_imports (via SQL function),
// computes seasonal index / YoY / trend / confidence, and writes 3-month
// forecasts to uppdragsradar_predictions.
//
// Trigger: pg_cron every Sunday at 03:00.
// Manual: POST {} (requires service_role key).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HORIZON_MONTHS = 3;
const HISTORY_MONTHS = 36;
const MIN_HISTORY_FOR_HIGH = 18; // months needed for high confidence
const MIN_HISTORY_FOR_MED = 6;

interface MonthlyAgg {
  customer: string;
  region: string;
  role: string;
  specialization: string;
  year_month: string;
  calloff_count: number;
}

interface ForecastInsert {
  customer: string;
  region: string | null;
  profession: string;
  specialization: string | null;
  month: string;
  expected_calloffs: number;
  expected_calloffs_display: number;
  seasonal_index: number | null;
  yoy_ratio: number | null;
  ytd_ratio: number | null;
  trend_ratio: number | null;
  confidence: "low" | "med" | "high";
  is_seasonal_peak: boolean;
  is_trend_break: boolean;
  forecast_run_id: string;
}

/** YYYY-MM string for date offset by N months from today (UTC). */
function ymOffset(monthsAhead: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsAhead);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Extract month number 1-12 from YYYY-MM. */
function monthNum(ym: string): number {
  return parseInt(ym.split("-")[1], 10);
}

function yearNum(ym: string): number {
  return parseInt(ym.split("-")[0], 10);
}

/** Compute forecast for one (customer, region, role, spec) group. */
function buildGroupForecasts(
  group: MonthlyAgg[],
  runId: string,
  targetMonths: string[],
): ForecastInsert[] {
  if (group.length === 0) return [];

  const first = group[0];
  // Build lookup: ym -> count
  const byMonth = new Map<string, number>();
  for (const r of group) byMonth.set(r.year_month, Number(r.calloff_count));

  const historyMonths = byMonth.size;
  const totalCalloffs = [...byMonth.values()].reduce((a, b) => a + b, 0);
  const avgPerMonth = totalCalloffs / Math.max(historyMonths, 1);

  // Seasonal index per calendar month (1-12) = avg(month) / avg(all)
  const monthBuckets: number[][] = Array.from({ length: 13 }, () => []);
  for (const [ym, cnt] of byMonth) {
    monthBuckets[monthNum(ym)].push(cnt);
  }
  const seasonalIdx = new Map<number, number>();
  for (let m = 1; m <= 12; m++) {
    const arr = monthBuckets[m];
    if (arr.length === 0) {
      seasonalIdx.set(m, 1);
    } else {
      const monthAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
      seasonalIdx.set(m, avgPerMonth > 0 ? monthAvg / avgPerMonth : 1);
    }
  }

  // Trend: compare last 3 months avg vs prior 3 months avg
  const sortedYms = [...byMonth.keys()].sort();
  const last3 = sortedYms.slice(-3);
  const prev3 = sortedYms.slice(-6, -3);
  const last3Avg = last3.length ? last3.reduce((a, ym) => a + (byMonth.get(ym) || 0), 0) / last3.length : 0;
  const prev3Avg = prev3.length ? prev3.reduce((a, ym) => a + (byMonth.get(ym) || 0), 0) / prev3.length : 0;
  const trendRatio = prev3Avg > 0 ? last3Avg / prev3Avg : null;
  const isTrendBreak = trendRatio !== null && (trendRatio >= 1.5 || trendRatio <= 0.5);

  // YTD ratio: this calendar year vs same period last year
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;
  let ytdThis = 0, ytdPrev = 0;
  for (const [ym, cnt] of byMonth) {
    const y = yearNum(ym);
    const m = monthNum(ym);
    if (y === thisYear && m <= thisMonth) ytdThis += cnt;
    if (y === thisYear - 1 && m <= thisMonth) ytdPrev += cnt;
  }
  const ytdRatio = ytdPrev > 0 ? ytdThis / ytdPrev : null;

  // Confidence
  let confidence: "low" | "med" | "high" = "low";
  if (historyMonths >= MIN_HISTORY_FOR_HIGH && totalCalloffs >= 12) confidence = "high";
  else if (historyMonths >= MIN_HISTORY_FOR_MED && totalCalloffs >= 4) confidence = "med";

  // Build forecasts for each target month
  const out: ForecastInsert[] = [];
  for (const targetYm of targetMonths) {
    const m = monthNum(targetYm);
    const seasonal = seasonalIdx.get(m) ?? 1;
    // Base forecast: avg × seasonal × trend (capped to avoid wild swings)
    const trendMultiplier = trendRatio !== null
      ? Math.max(0.5, Math.min(1.5, trendRatio))
      : 1;
    const expected = avgPerMonth * seasonal * trendMultiplier;

    // Seasonal peak = top 3 months by seasonal index
    const sortedSeasonal = [...seasonalIdx.entries()].sort((a, b) => b[1] - a[1]);
    const peakMonths = new Set(sortedSeasonal.slice(0, 3).map(([m]) => m));
    const isPeak = peakMonths.has(m) && seasonal > 1.1;

    out.push({
      customer: first.customer,
      region: first.region || null,
      profession: first.role,
      specialization: first.specialization || null,
      month: targetYm,
      expected_calloffs: Number(expected.toFixed(2)),
      expected_calloffs_display: Math.max(0, Math.round(expected)),
      seasonal_index: Number(seasonal.toFixed(3)),
      yoy_ratio: ytdRatio,
      ytd_ratio: ytdRatio,
      trend_ratio: trendRatio,
      confidence,
      is_seasonal_peak: isPeak,
      is_trend_break: isTrendBreak,
      forecast_run_id: runId,
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // 1. Pull aggregated monthly data
    const { data: agg, error: aggErr } = await supabase.rpc(
      "aggregate_calloff_monthly",
      { _months_back: HISTORY_MONTHS },
    );
    if (aggErr) throw aggErr;
    const rows = (agg || []) as MonthlyAgg[];

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "no calloff data", inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Group by (customer, region, role, specialization)
    const groups = new Map<string, MonthlyAgg[]>();
    for (const r of rows) {
      const key = `${r.customer}||${r.region || ""}||${r.role}||${r.specialization || ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // 3. Compute target months (next 3, starting next month)
    const targetMonths = Array.from({ length: HORIZON_MONTHS }, (_, i) => ymOffset(i + 1));

    // 4. Build forecasts
    const runId = crypto.randomUUID();
    const allForecasts: ForecastInsert[] = [];
    for (const group of groups.values()) {
      allForecasts.push(...buildGroupForecasts(group, runId, targetMonths));
    }

    // 5. Replace old predictions for these target months, then insert new
    // Strategy: delete only rows for the current target months (keeps historical runs auditable for other months)
    const { error: delErr } = await supabase
      .from("uppdragsradar_predictions")
      .delete()
      .in("month", targetMonths);
    if (delErr) throw delErr;

    // 6. Bulk insert in batches of 500
    let inserted = 0;
    const batchSize = 500;
    for (let i = 0; i < allForecasts.length; i += batchSize) {
      const batch = allForecasts.slice(i, i + batchSize);
      const { error: insErr } = await supabase
        .from("uppdragsradar_predictions")
        .insert(batch);
      if (insErr) throw insErr;
      inserted += batch.length;
    }

    const elapsed = Date.now() - startedAt;
    return new Response(
      JSON.stringify({
        ok: true,
        forecast_run_id: runId,
        groups: groups.size,
        target_months: targetMonths,
        inserted,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[refresh-uppdragsradar-forecast]", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
