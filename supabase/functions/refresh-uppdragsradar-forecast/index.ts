// Refresh Uppdragsradar forecast — runs weekly via pg_cron.
// Reads aggregated monthly volumes from calloff_imports (via SQL function),
// computes seasonal index / YoY / trend / confidence, and writes 3-month
// forecasts to uppdragsradar_predictions.
//
// Trigger: pg_cron every Sunday at 03:00.
// Manual: POST {} (requires service_role key).
//
// Sanity checks (logged to pipeline_health_logs):
//   1. EMPTY_AGGREGATOR  — RPC returned 0 rows (data pipe broken)
//   2. THIN_HISTORY      — >50% of segments have <3 months of history
//   3. INSERT_FAILED     — DB insert error (caught & rethrown)
//   4. VOLUME_SHOCK      — total expected volume deviates >40% vs previous run

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TASK_NAME = "refresh-uppdragsradar-forecast";
const HORIZON_MONTHS = 3;
const HISTORY_MONTHS = 36;
const MIN_HISTORY_FOR_HIGH = 18;
const MIN_HISTORY_FOR_MED = 6;
const THIN_HISTORY_THRESHOLD = 3;          // months
const THIN_HISTORY_RATIO_ALERT = 0.5;      // >50% groups thin = alert
const VOLUME_SHOCK_RATIO = 0.4;            // >40% drift vs prev run = alert

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

interface SanityCheck {
  code: "EMPTY_AGGREGATOR" | "THIN_HISTORY" | "INSERT_FAILED" | "VOLUME_SHOCK";
  severity: "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

function ymOffset(monthsAhead: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsAhead);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthNum(ym: string): number {
  return parseInt(ym.split("-")[1], 10);
}
function yearNum(ym: string): number {
  return parseInt(ym.split("-")[0], 10);
}

function buildGroupForecasts(
  group: MonthlyAgg[],
  runId: string,
  targetMonths: string[],
): ForecastInsert[] {
  if (group.length === 0) return [];

  const first = group[0];
  const byMonth = new Map<string, number>();
  for (const r of group) byMonth.set(r.year_month, Number(r.calloff_count));

  const historyMonths = byMonth.size;
  const totalCalloffs = [...byMonth.values()].reduce((a, b) => a + b, 0);
  const avgPerMonth = totalCalloffs / Math.max(historyMonths, 1);

  const monthBuckets: number[][] = Array.from({ length: 13 }, () => []);
  for (const [ym, cnt] of byMonth) monthBuckets[monthNum(ym)].push(cnt);
  const seasonalIdx = new Map<number, number>();
  for (let m = 1; m <= 12; m++) {
    const arr = monthBuckets[m];
    if (arr.length === 0) seasonalIdx.set(m, 1);
    else {
      const monthAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
      seasonalIdx.set(m, avgPerMonth > 0 ? monthAvg / avgPerMonth : 1);
    }
  }

  const sortedYms = [...byMonth.keys()].sort();
  const last3 = sortedYms.slice(-3);
  const prev3 = sortedYms.slice(-6, -3);
  const last3Avg = last3.length ? last3.reduce((a, ym) => a + (byMonth.get(ym) || 0), 0) / last3.length : 0;
  const prev3Avg = prev3.length ? prev3.reduce((a, ym) => a + (byMonth.get(ym) || 0), 0) / prev3.length : 0;
  const trendRatio = prev3Avg > 0 ? last3Avg / prev3Avg : null;
  const isTrendBreak = trendRatio !== null && (trendRatio >= 1.5 || trendRatio <= 0.5);

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

  let confidence: "low" | "med" | "high" = "low";
  if (historyMonths >= MIN_HISTORY_FOR_HIGH && totalCalloffs >= 12) confidence = "high";
  else if (historyMonths >= MIN_HISTORY_FOR_MED && totalCalloffs >= 4) confidence = "med";

  const sortedSeasonal = [...seasonalIdx.entries()].sort((a, b) => b[1] - a[1]);
  const peakMonths = new Set(sortedSeasonal.slice(0, 3).map(([m]) => m));

  const out: ForecastInsert[] = [];
  for (const targetYm of targetMonths) {
    const m = monthNum(targetYm);
    const seasonal = seasonalIdx.get(m) ?? 1;
    const trendMultiplier = trendRatio !== null ? Math.max(0.5, Math.min(1.5, trendRatio)) : 1;
    const expected = avgPerMonth * seasonal * trendMultiplier;
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

  const sanityChecks: SanityCheck[] = [];
  const runId = crypto.randomUUID();

  // Log "started" so watchdog can detect crashes mid-run
  await supabase.from("pipeline_health_logs").insert({
    task_name: TASK_NAME,
    status: "started",
    metadata: { forecast_run_id: runId },
  });

  try {
    // 1. Pull aggregated monthly data
    const { data: agg, error: aggErr } = await supabase.rpc(
      "aggregate_calloff_monthly",
      { _months_back: HISTORY_MONTHS },
    );
    if (aggErr) throw aggErr;
    const rows = (agg || []) as MonthlyAgg[];

    // ─── SANITY CHECK 1: EMPTY_AGGREGATOR ───────────────────────────
    if (rows.length === 0) {
      sanityChecks.push({
        code: "EMPTY_AGGREGATOR",
        severity: "error",
        message: "Aggregator returned 0 rows — calloff_imports may be empty or data pipe broken.",
      });
      await supabase.from("pipeline_health_logs").insert({
        task_name: TASK_NAME,
        status: "failed",
        rows_processed: 0,
        sanity_checks: sanityChecks,
        error_message: "EMPTY_AGGREGATOR",
        duration_ms: Date.now() - startedAt,
        metadata: { forecast_run_id: runId },
      });
      return new Response(
        JSON.stringify({ ok: false, error: "EMPTY_AGGREGATOR", inserted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Group by (customer, region, role, specialization)
    const groups = new Map<string, MonthlyAgg[]>();
    for (const r of rows) {
      const key = `${r.customer}||${r.region || ""}||${r.role}||${r.specialization || ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // ─── SANITY CHECK 2: THIN_HISTORY ───────────────────────────────
    let thinGroups = 0;
    for (const g of groups.values()) {
      const distinctMonths = new Set(g.map((r) => r.year_month)).size;
      if (distinctMonths < THIN_HISTORY_THRESHOLD) thinGroups++;
    }
    const thinRatio = thinGroups / groups.size;
    if (thinRatio > THIN_HISTORY_RATIO_ALERT) {
      sanityChecks.push({
        code: "THIN_HISTORY",
        severity: "warn",
        message: `${(thinRatio * 100).toFixed(0)}% of segments have <${THIN_HISTORY_THRESHOLD} months history.`,
        details: { thin_groups: thinGroups, total_groups: groups.size, threshold: THIN_HISTORY_THRESHOLD },
      });
    }

    // 3. Compute target months
    const targetMonths = Array.from({ length: HORIZON_MONTHS }, (_, i) => ymOffset(i + 1));

    // 4. Build forecasts
    const allForecasts: ForecastInsert[] = [];
    for (const group of groups.values()) {
      allForecasts.push(...buildGroupForecasts(group, runId, targetMonths));
    }

    // ─── SANITY CHECK 4: VOLUME_SHOCK ───────────────────────────────
    // Compare total expected volume vs previous run (same target months)
    const totalExpected = allForecasts.reduce((a, f) => a + f.expected_calloffs, 0);
    const { data: prevAgg } = await supabase
      .from("uppdragsradar_predictions")
      .select("expected_calloffs")
      .in("month", targetMonths);
    const prevTotal = (prevAgg || []).reduce(
      (a, r) => a + Number(r.expected_calloffs || 0),
      0,
    );
    if (prevTotal > 0) {
      const drift = Math.abs(totalExpected - prevTotal) / prevTotal;
      if (drift > VOLUME_SHOCK_RATIO) {
        sanityChecks.push({
          code: "VOLUME_SHOCK",
          severity: "warn",
          message: `Total forecast volume drifted ${(drift * 100).toFixed(0)}% vs previous run.`,
          details: { previous_total: prevTotal, new_total: totalExpected, drift_ratio: drift },
        });
      }
    }

    // 5. Replace old predictions for these target months
    const { error: delErr } = await supabase
      .from("uppdragsradar_predictions")
      .delete()
      .in("month", targetMonths);
    if (delErr) throw delErr;

    // 6. Bulk insert in batches of 500
    let inserted = 0;
    const batchSize = 500;
    try {
      for (let i = 0; i < allForecasts.length; i += batchSize) {
        const batch = allForecasts.slice(i, i + batchSize);
        const { error: insErr } = await supabase
          .from("uppdragsradar_predictions")
          .insert(batch);
        if (insErr) throw insErr;
        inserted += batch.length;
      }
    } catch (insErr) {
      // ─── SANITY CHECK 3: INSERT_FAILED ───────────────────────────
      sanityChecks.push({
        code: "INSERT_FAILED",
        severity: "error",
        message: insErr instanceof Error ? insErr.message : String(insErr),
        details: { inserted_so_far: inserted, target: allForecasts.length },
      });
      throw insErr;
    }

    const elapsed = Date.now() - startedAt;
    const status = sanityChecks.some((c) => c.severity === "error")
      ? "failed"
      : sanityChecks.length > 0
      ? "partial"
      : "success";

    await supabase.from("pipeline_health_logs").insert({
      task_name: TASK_NAME,
      status,
      rows_processed: inserted,
      sanity_checks: sanityChecks,
      duration_ms: elapsed,
      metadata: {
        forecast_run_id: runId,
        groups: groups.size,
        target_months: targetMonths,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        forecast_run_id: runId,
        groups: groups.size,
        target_months: targetMonths,
        inserted,
        sanity_checks: sanityChecks,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[refresh-uppdragsradar-forecast]", err);
    await supabase.from("pipeline_health_logs").insert({
      task_name: TASK_NAME,
      status: "failed",
      sanity_checks: sanityChecks,
      error_message: msg,
      duration_ms: Date.now() - startedAt,
      metadata: { forecast_run_id: runId },
    });
    return new Response(
      JSON.stringify({ ok: false, error: msg, sanity_checks: sanityChecks }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
