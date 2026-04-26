// Backtest Uppdragsradar accuracy.
// Runs the 5th of every month via pg_cron — evaluates predictions for the
// just-completed month against actual calloff_imports, writes results to
// prediction_backtests, and flags high-confidence predictions with >50% drift
// as is_under_review = true so the UI can show a neutral disclaimer.
//
// Manual: POST { "month": "2026-03" }  (defaults to previous calendar month)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TASK_NAME = "backtest-uppdragsradar-accuracy";
const HIGH_CONF_DRIFT_ALERT = 0.5; // >50% drift in high-confidence = alert + review

interface PredictionRow {
  id: string;
  forecast_run_id: string;
  customer: string;
  region: string | null;
  profession: string | null;
  specialization: string | null;
  month: string;
  expected_calloffs: number;
  confidence: string | null;
}

interface ActualRow {
  customer: string;
  region: string | null;
  role: string | null;
  specialization: string | null;
  count: number;
}

function previousMonthYm(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ymRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  // first day of next month (exclusive upper bound)
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const end = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  return { start, end };
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

  let body: { month?: string } = {};
  try {
    body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  } catch (_) { /* noop */ }

  const targetMonth = body.month || previousMonthYm();

  await supabase.from("pipeline_health_logs").insert({
    task_name: TASK_NAME,
    status: "started",
    metadata: { target_month: targetMonth },
  });

  try {
    // 1. Load predictions for the target month
    const { data: preds, error: predErr } = await supabase
      .from("uppdragsradar_predictions")
      .select("id, forecast_run_id, customer, region, profession, specialization, month, expected_calloffs, confidence")
      .eq("month", targetMonth);
    if (predErr) throw predErr;
    const predictions = (preds || []) as PredictionRow[];

    if (predictions.length === 0) {
      await supabase.from("pipeline_health_logs").insert({
        task_name: TASK_NAME,
        status: "partial",
        rows_processed: 0,
        error_message: "no_predictions_for_month",
        duration_ms: Date.now() - startedAt,
        metadata: { target_month: targetMonth },
      });
      return new Response(
        JSON.stringify({ ok: true, target_month: targetMonth, message: "no predictions to evaluate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Load actual calloffs for the same month
    const { start, end } = ymRange(targetMonth);
    const { data: actualsRaw, error: actErr } = await supabase
      .from("calloff_imports")
      .select("customer, region, role, specialization, calloff_date")
      .gte("calloff_date", start)
      .lt("calloff_date", end);
    if (actErr) throw actErr;

    // 3. Aggregate actuals by segment key
    const actualMap = new Map<string, number>();
    for (const r of actualsRaw || []) {
      const key = `${r.customer || ""}||${r.region || ""}||${r.role || ""}||${r.specialization || ""}`;
      actualMap.set(key, (actualMap.get(key) || 0) + 1);
    }

    // 4. Build backtest rows + collect prediction IDs to flag
    const backtestRows: Record<string, unknown>[] = [];
    const idsToReview: string[] = [];
    let totalAbsError = 0;
    let highConfDriftCount = 0;

    for (const p of predictions) {
      const key = `${p.customer}||${p.region || ""}||${p.profession || ""}||${p.specialization || ""}`;
      const actual = actualMap.get(key) || 0;
      const expected = Number(p.expected_calloffs);
      const absError = Math.abs(expected - actual);
      const driftRatio = expected > 0 ? absError / expected : null;
      const isHighConf = p.confidence === "high";
      const isDriftAlert = isHighConf && driftRatio !== null && driftRatio > HIGH_CONF_DRIFT_ALERT;

      totalAbsError += absError;
      if (isDriftAlert) {
        highConfDriftCount++;
        idsToReview.push(p.id);
      }

      backtestRows.push({
        forecast_run_id: p.forecast_run_id,
        customer: p.customer,
        region: p.region,
        profession: p.profession,
        specialization: p.specialization,
        month: p.month,
        expected_calloffs: expected,
        actual_calloffs: actual,
        abs_error: absError,
        drift_ratio: driftRatio,
        confidence: p.confidence,
        is_drift_alert: isDriftAlert,
      });
    }

    // 5. Insert backtest rows in batches of 500
    let inserted = 0;
    for (let i = 0; i < backtestRows.length; i += 500) {
      const batch = backtestRows.slice(i, i + 500);
      const { error: insErr } = await supabase.from("prediction_backtests").insert(batch);
      if (insErr) throw insErr;
      inserted += batch.length;
    }

    // 6. Flag drifted high-confidence predictions in the UI
    let flagged = 0;
    if (idsToReview.length > 0) {
      // batch in chunks of 200 for IN-clause safety
      for (let i = 0; i < idsToReview.length; i += 200) {
        const chunk = idsToReview.slice(i, i + 200);
        const { error: updErr, count } = await supabase
          .from("uppdragsradar_predictions")
          .update({ is_under_review: true }, { count: "exact" })
          .in("id", chunk);
        if (updErr) throw updErr;
        flagged += count || 0;
      }
    }

    const mae = predictions.length > 0 ? totalAbsError / predictions.length : 0;
    const elapsed = Date.now() - startedAt;
    const status = highConfDriftCount > 0 ? "partial" : "success";

    await supabase.from("pipeline_health_logs").insert({
      task_name: TASK_NAME,
      status,
      rows_processed: inserted,
      duration_ms: elapsed,
      metadata: {
        target_month: targetMonth,
        predictions_evaluated: predictions.length,
        mae: Number(mae.toFixed(3)),
        high_conf_drift_count: highConfDriftCount,
        flagged_under_review: flagged,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        target_month: targetMonth,
        predictions_evaluated: predictions.length,
        mae: Number(mae.toFixed(3)),
        high_conf_drift_count: highConfDriftCount,
        flagged_under_review: flagged,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[backtest-uppdragsradar-accuracy]", err);
    await supabase.from("pipeline_health_logs").insert({
      task_name: TASK_NAME,
      status: "failed",
      error_message: msg,
      duration_ms: Date.now() - startedAt,
      metadata: { target_month: targetMonth },
    });
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
