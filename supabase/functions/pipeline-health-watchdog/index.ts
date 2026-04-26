// Pipeline health watchdog — runs Mondays 06:30 via pg_cron.
//
// 1. LIVENESS: checks if refresh-uppdragsradar-forecast logged a 'success' or
//    'partial' run within the last 8 days. If not → ALERT (silent death).
// 2. WEEKLY REPORT: aggregates last 7 days of pipeline_health_logs + latest
//    backtest stats, sends summary email to admin.
//
// Manual: POST {} (requires service_role key).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TASK_NAME = "pipeline-health-watchdog";
const LIVENESS_WINDOW_DAYS = 8;
const FORECAST_TASK = "refresh-uppdragsradar-forecast";
const BACKTEST_TASK = "backtest-uppdragsradar-accuracy";
const DEFAULT_ALERT_EMAIL = "anders@compcare.se";

interface HealthLog {
  task_name: string;
  status: string;
  rows_processed: number | null;
  sanity_checks: any;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  metadata: any;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, error: "missing email credentials" };
  }
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CompCare <noreply@mail.compcare.se>",
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, error: `resend ${res.status}: ${txt.slice(0, 200)}` };
  }
  return { ok: true };
}

function buildReportHtml(args: {
  isLivenessAlert: boolean;
  lastForecastRun: HealthLog | null;
  weekLogs: HealthLog[];
  latestBacktest: HealthLog | null;
  underReviewCount: number;
}): { subject: string; html: string } {
  const { isLivenessAlert, lastForecastRun, weekLogs, latestBacktest, underReviewCount } = args;

  const successCount = weekLogs.filter((l) => l.status === "success").length;
  const partialCount = weekLogs.filter((l) => l.status === "partial").length;
  const failedCount = weekLogs.filter((l) => l.status === "failed").length;

  const lastForecastTime = lastForecastRun
    ? new Date(lastForecastRun.created_at).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })
    : "ingen körning hittad";

  const lastForecastRows = lastForecastRun?.rows_processed ?? 0;
  const lastForecastStatus = lastForecastRun?.status ?? "—";

  const mae = latestBacktest?.metadata?.mae ?? null;
  const driftCount = latestBacktest?.metadata?.high_conf_drift_count ?? 0;
  const evaluated = latestBacktest?.metadata?.predictions_evaluated ?? 0;
  const backtestMonth = latestBacktest?.metadata?.target_month ?? "—";

  const sanityWarnings: string[] = [];
  for (const l of weekLogs) {
    const checks = Array.isArray(l.sanity_checks) ? l.sanity_checks : [];
    for (const c of checks) {
      sanityWarnings.push(`${l.task_name} → ${c.code}: ${c.message}`);
    }
  }

  const subject = isLivenessAlert
    ? "🚨 CompCare Pipeline: Uppdragsradar tyst >8 dygn"
    : `CompCare Pipeline – veckorapport (${successCount + partialCount}/${weekLogs.length} OK)`;

  const alertBanner = isLivenessAlert
    ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:16px;margin-bottom:24px;border-radius:4px;">
         <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">Liveness-larm</p>
         <p style="margin:4px 0 0;font-size:13px;color:#7f1d1d;">
           Ingen lyckad körning av <code>${FORECAST_TASK}</code> de senaste ${LIVENESS_WINDOW_DAYS} dygnen. Senaste: ${escapeHtml(lastForecastTime)} (${escapeHtml(lastForecastStatus)}).
         </p>
       </div>`
    : "";

  const sanityList = sanityWarnings.length === 0
    ? `<p style="font-size:13px;color:#64748b;margin:0;">Inga sanity-varningar denna vecka.</p>`
    : `<ul style="font-size:13px;color:#475569;margin:0;padding-left:20px;line-height:1.6;">
         ${sanityWarnings.slice(0, 10).map((w) => `<li>${escapeHtml(w)}</li>`).join("")}
       </ul>`;

  const html = `<!DOCTYPE html>
<html lang="sv"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;background:#ffffff;">
    <h1 style="font-size:18px;color:#0f172a;margin:0 0 4px;font-weight:600;">CompCare – Uppdragsradar Pipeline</h1>
    <p style="font-size:13px;color:#64748b;margin:0 0 28px;">Veckorapport · ${new Date().toLocaleDateString("sv-SE")}</p>

    ${alertBanner}

    <h2 style="font-size:14px;color:#0f172a;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Liveness</h2>
    <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:6px 0;color:#64748b;">Senaste prognoskörning</td><td style="padding:6px 0;text-align:right;">${escapeHtml(lastForecastTime)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Status</td><td style="padding:6px 0;text-align:right;">${escapeHtml(lastForecastStatus)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Prognoser skapade</td><td style="padding:6px 0;text-align:right;">${lastForecastRows}</td></tr>
    </table>

    <h2 style="font-size:14px;color:#0f172a;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Vecka i siffror</h2>
    <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:6px 0;color:#64748b;">Lyckade körningar</td><td style="padding:6px 0;text-align:right;">${successCount}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Partial (med varning)</td><td style="padding:6px 0;text-align:right;">${partialCount}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Misslyckade</td><td style="padding:6px 0;text-align:right;color:${failedCount > 0 ? "#dc2626" : "#334155"};">${failedCount}</td></tr>
    </table>

    <h2 style="font-size:14px;color:#0f172a;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Precision (senaste backtest)</h2>
    <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:6px 0;color:#64748b;">Utvärderad månad</td><td style="padding:6px 0;text-align:right;">${escapeHtml(String(backtestMonth))}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Prognoser jämförda</td><td style="padding:6px 0;text-align:right;">${evaluated}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">MAE (avrop/segment)</td><td style="padding:6px 0;text-align:right;">${mae !== null ? mae : "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">High-confidence drift &gt;50%</td><td style="padding:6px 0;text-align:right;color:${driftCount > 0 ? "#d97706" : "#334155"};">${driftCount}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Prognoser under granskning</td><td style="padding:6px 0;text-align:right;">${underReviewCount}</td></tr>
    </table>

    <h2 style="font-size:14px;color:#0f172a;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Sanity-varningar</h2>
    ${sanityList}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;">
    <p style="font-size:11px;color:#94a3b8;margin:0;line-height:1.5;">
      Automatiskt genererad av <code>pipeline-health-watchdog</code>. Data hämtad från <code>pipeline_health_logs</code> och <code>prediction_backtests</code>.
    </p>
  </div>
</body></html>`;

  return { subject, html };
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

  const alertEmail = Deno.env.get("WATCHDOG_ALERT_EMAIL") || DEFAULT_ALERT_EMAIL;

  try {
    const { data: lastSuccessRows } = await supabase
      .from("pipeline_health_logs")
      .select("*")
      .eq("task_name", FORECAST_TASK)
      .in("status", ["success", "partial"])
      .order("created_at", { ascending: false })
      .limit(1);
    const lastForecastRun = (lastSuccessRows?.[0] as HealthLog | undefined) ?? null;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - LIVENESS_WINDOW_DAYS);
    const isLivenessAlert = !lastForecastRun ||
      new Date(lastForecastRun.created_at).getTime() < cutoff.getTime();

    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const { data: weekRows } = await supabase
      .from("pipeline_health_logs")
      .select("*")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false });
    const weekLogs = (weekRows || []) as HealthLog[];

    const { data: backtestRows } = await supabase
      .from("pipeline_health_logs")
      .select("*")
      .eq("task_name", BACKTEST_TASK)
      .in("status", ["success", "partial"])
      .order("created_at", { ascending: false })
      .limit(1);
    const latestBacktest = (backtestRows?.[0] as HealthLog | undefined) ?? null;

    const { count: underReviewCount } = await supabase
      .from("uppdragsradar_predictions")
      .select("id", { count: "exact", head: true })
      .eq("is_under_review", true);

    const { subject, html } = buildReportHtml({
      isLivenessAlert,
      lastForecastRun,
      weekLogs,
      latestBacktest,
      underReviewCount: underReviewCount || 0,
    });

    const emailResult = await sendEmail({ to: alertEmail, subject, html });

    const elapsed = Date.now() - startedAt;
    const status = isLivenessAlert
      ? "partial"
      : emailResult.ok
      ? "success"
      : "failed";

    await supabase.from("pipeline_health_logs").insert({
      task_name: TASK_NAME,
      status,
      duration_ms: elapsed,
      error_message: emailResult.ok ? null : emailResult.error,
      metadata: {
        liveness_alert: isLivenessAlert,
        recipient: alertEmail,
        week_logs_count: weekLogs.length,
        under_review: underReviewCount || 0,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        liveness_alert: isLivenessAlert,
        email_sent: emailResult.ok,
        email_error: emailResult.ok ? null : emailResult.error,
        recipient: alertEmail,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[pipeline-health-watchdog]", err);
    await supabase.from("pipeline_health_logs").insert({
      task_name: TASK_NAME,
      status: "failed",
      error_message: msg,
      duration_ms: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
