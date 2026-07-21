// Health check — runs every 15 min via pg_cron.
//
// Synthetic checks:
//   1. save-email: ensure POST returns either 200 or 4xx (NOT 500/Lead not found).
//   2. get-report: ensure POST with bogus id returns 4xx, not 5xx.
//   3. edge function 5xx scan: query last 15 min of analytics for 500/503.
//
// On error: insert into system_health_log + send formatted alert email
// containing a ready-to-paste chat prompt for the Lovable agent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALERT_EMAIL = "anders@compcare.se";
const PROJECT_URL = "https://lovable.dev/projects/f4c1323e-7c72-43ee-978e-fa632a197c62";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface CheckResult {
  name: string;
  status: "ok" | "warn" | "error";
  error_message?: string;
  details?: Record<string, unknown>;
  duration_ms: number;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t0 };
}

// Retry an HTTP probe once after 2s if first attempt returns 5xx or throws.
// Filters out transient edge-runtime blips (e.g. SUPABASE_EDGE_RUNTIME_SERVICE_DEGRADED).
async function fetchWithRetry(doFetch: () => Promise<Response>): Promise<Response> {
  try {
    const r = await doFetch();
    if (r.status < 500) return r;
    await r.body?.cancel().catch(() => {});
  } catch (_) {
    // fall through to retry
  }
  await new Promise((res) => setTimeout(res, 2000));
  return doFetch();
}

// 1. save-email: should NOT 500. Bogus lead_id -> expect 400/404.
async function checkSaveEmail(): Promise<CheckResult> {
  const { result, ms } = await timed(async () => {
    return fetchWithRetry(() => fetch(`${SUPABASE_URL}/functions/v1/save-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        lead_id: "00000000-0000-0000-0000-000000000000",
        email: "healthcheck@compcare.se",
      }),
    }));
  });
  const txt = await result.text().catch(() => "");
  if (result.status >= 500) {
    return {
      name: "save-email",
      status: "error",
      error_message: `HTTP ${result.status}: ${txt.slice(0, 300)}`,
      details: { http_status: result.status, body: txt.slice(0, 500) },
      duration_ms: ms,
    };
  }
  // Detect schema-mismatch leak even on 4xx: body containing "does not exist" / "column"
  if (/does not exist|column .* does not/i.test(txt)) {
    return {
      name: "save-email",
      status: "error",
      error_message: `Schema mismatch leak: ${txt.slice(0, 300)}`,
      details: { http_status: result.status, body: txt.slice(0, 500) },
      duration_ms: ms,
    };
  }
  return { name: "save-email", status: "ok", duration_ms: ms, details: { http_status: result.status } };
}

// 2. get-report: bogus id -> expect 4xx
async function checkGetReport(): Promise<CheckResult> {
  const { result, ms } = await timed(async () => {
    return fetchWithRetry(() => fetch(`${SUPABASE_URL}/functions/v1/get-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ report_id: "00000000-0000-0000-0000-000000000000" }),
    }));
  });
  const txt = await result.text().catch(() => "");
  if (result.status >= 500) {
    return {
      name: "get-report",
      status: "error",
      error_message: `HTTP ${result.status}: ${txt.slice(0, 300)}`,
      details: { http_status: result.status, body: txt.slice(0, 500) },
      duration_ms: ms,
    };
  }
  if (/does not exist|column .* does not/i.test(txt)) {
    return {
      name: "get-report",
      status: "error",
      error_message: `Schema mismatch leak: ${txt.slice(0, 300)}`,
      details: { http_status: result.status, body: txt.slice(0, 500) },
      duration_ms: ms,
    };
  }
  return { name: "get-report", status: "ok", duration_ms: ms, details: { http_status: result.status } };
}

// 3. lead-conversion last 24h: warn if <30%.
// Post-SignupGate: a lead is "converted" if it has an email OR a downstream
// report was generated (implies the user progressed through the teaser/signup).
// Email is often captured on the auth user instead of the lead row after the
// MailGate → SignupGate migration, so email-only would false-positive.
async function checkConversion(supabase: ReturnType<typeof createClient>): Promise<CheckResult> {
  const t0 = Date.now();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: total } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  const { count: withEmail } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .not("email", "is", null)
    .neq("email", "");
  // Leads that generated at least one report in the window — treated as converted
  // even if lead.email is null (signup-gate path stores email on auth.users).
  const { data: reportRows } = await supabase
    .from("reports")
    .select("lead_id, leads!inner(created_at)")
    .gte("leads.created_at", since);
  const convertedLeadIds = new Set<string>((reportRows ?? []).map((r: { lead_id: string }) => r.lead_id));
  const { data: emailedIds } = await supabase
    .from("leads")
    .select("id")
    .gte("created_at", since)
    .not("email", "is", null)
    .neq("email", "");
  for (const row of emailedIds ?? []) convertedLeadIds.add((row as { id: string }).id);
  const converted = convertedLeadIds.size;
  const ms = Date.now() - t0;
  const ratio = total && total > 0 ? converted / total : 1;
  if ((total ?? 0) >= 10 && ratio < 0.3) {
    return {
      name: "lead-email-conversion-24h",
      status: "warn",
      error_message: `Endast ${Math.round(ratio * 100)}% av leads konverterade (${converted}/${total}, varav ${withEmail ?? 0} med email) — under 30% tröskel`,
      details: { total, converted, with_email: withEmail, ratio },
      duration_ms: ms,
    };
  }
  return {
    name: "lead-email-conversion-24h",
    status: "ok",
    details: { total, converted, with_email: withEmail, ratio },
    duration_ms: ms,
  };
}


function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

function buildAlertHtml(failures: CheckResult[], alertId: string): { subject: string; html: string } {
  const subject = `🚨 CompCare health-alert (${failures.length}): ${failures.map((f) => f.name).join(", ")}`;
  const chatPrompt = `Fixa health-alert ${alertId}: ${failures
    .map((f) => `${f.name} → ${f.error_message ?? "fail"}`)
    .join(" | ")}. Loggar i system_health_log.alert_id='${alertId}'.`;

  const rows = failures.map((f) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${escapeHtml(f.name)}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;color:${f.status === "error" ? "#c00" : "#b80"};">${f.status.toUpperCase()}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;font-size:12px;">${escapeHtml(f.error_message ?? "")}</td>
    </tr>
  `).join("");

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111;">
    <h2 style="margin:0 0 8px;color:#c00;">🚨 CompCare: fel upptäckt</h2>
    <p style="margin:0 0 16px;color:#555;">Alert-ID: <code>${alertId}</code> · ${new Date().toISOString()}</p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
      <thead><tr style="background:#f5f5f5;">
        <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Check</th>
        <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Status</th>
        <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Detalj</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h3 style="margin:24px 0 8px;">Klistra in detta i Lovable-chatten för att fixa:</h3>
    <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.5;">${escapeHtml(chatPrompt)}</pre>
    <p style="margin-top:24px;"><a href="${PROJECT_URL}" style="background:#8155FF;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Öppna Lovable →</a></p>
    <p style="margin-top:32px;color:#888;font-size:12px;">CompCare health-check · automatiskt utskick · var 15 min</p>
  </body></html>`;

  return { subject, html };
}

async function sendAlertEmail(failures: CheckResult[], alertId: string): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, error: "missing email credentials" };
  }
  const { subject, html } = buildAlertHtml(failures, alertId);
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CompCare Health <noreply@mail.compcare.se>",
      to: [ALERT_EMAIL],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, error: `resend ${res.status}: ${txt.slice(0, 200)}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Accept either a cron-token (from pg_cron via Vault) or an admin user / service role.
  const cronToken = req.headers.get("x-cron-token");
  if (cronToken) {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data } = await supabaseAdmin
      .rpc("get_health_check_cron_token")
      .single<string>();
    if (!data || cronToken !== data) {
      return new Response(JSON.stringify({ error: "Invalid cron token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    const guard = await requireCronOrAdmin(req);
    if (guard) return guard;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const checks: CheckResult[] = [];

  // Run checks (sequential — keeps log clean & avoids rate-limit collisions)
  try { checks.push(await checkSaveEmail()); }
  catch (e) { checks.push({ name: "save-email", status: "error", error_message: String(e), duration_ms: 0 }); }

  try { checks.push(await checkGetReport()); }
  catch (e) { checks.push({ name: "get-report", status: "error", error_message: String(e), duration_ms: 0 }); }

  try { checks.push(await checkConversion(supabase)); }
  catch (e) { checks.push({ name: "lead-email-conversion-24h", status: "error", error_message: String(e), duration_ms: 0 }); }

  const failures = checks.filter((c) => c.status !== "ok");
  const alertId = `hc_${Date.now().toString(36)}`;
  let alertSentAt: string | null = null;

  // Gate 1: require 2-in-a-row failures per check before alerting (filters transient blips).
  // Gate 2: de-dup — skip if same check already alerted within last 60 min.
  if (failures.length > 0) {
    // Look up previous (most recent) status per failing check
    const { data: prevRows } = await supabase
      .from("system_health_log")
      .select("check_name, status, created_at")
      .in("check_name", failures.map((f) => f.name))
      .order("created_at", { ascending: false })
      .limit(failures.length * 5);
    const prevStatusByName = new Map<string, string>();
    for (const r of (prevRows ?? []) as any[]) {
      if (!prevStatusByName.has(r.check_name)) prevStatusByName.set(r.check_name, r.status);
    }
    const confirmedFailures = failures.filter((f) => prevStatusByName.get(f.name) && prevStatusByName.get(f.name) !== "ok");
    if (confirmedFailures.length === 0) {
      console.log("[health-check] suppressed alert (first failure, awaiting confirmation)");
    } else {
      const sinceMs = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("system_health_log")
        .select("check_name, alert_sent_at")
        .gte("created_at", sinceMs)
        .not("alert_sent_at", "is", null);
      const recentNames = new Set((recent ?? []).map((r: any) => r.check_name));
      const newFailures = confirmedFailures.filter((f) => !recentNames.has(f.name));
      if (newFailures.length > 0) {
        const mail = await sendAlertEmail(newFailures, alertId);
        if (mail.ok) alertSentAt = new Date().toISOString();
        else console.error("[health-check] email send failed:", mail.error);
      } else {
        console.log("[health-check] suppressed alert (already sent within 60 min)");
      }
    }
  }

  // Persist all results
  const rows = checks.map((c) => ({
    check_name: c.name,
    status: c.status,
    error_message: c.error_message ?? null,
    details: c.details ?? {},
    duration_ms: c.duration_ms,
    alert_sent_at: c.status !== "ok" ? alertSentAt : null,
    alert_id: c.status !== "ok" ? alertId : null,
  }));
  await supabase.from("system_health_log").insert(rows);

  return new Response(
    JSON.stringify({ alert_id: alertId, alert_sent: !!alertSentAt, checks }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
