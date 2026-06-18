// Conversion monitor — runs daily ~07:00 via pg_cron.
//
// Reads public.analytics_events for last 24h and computes critical funnel ratios.
// If any ratio drops below threshold (and traffic >= min sample), send chat-ready alert.
//
// Tracked events: survey_started, teaser_viewed, email_collected, report_viewed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendChatAlert } from "../_shared/alertMail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface FunnelStep {
  key: string;
  numerator: string;
  denominator: string;
  threshold: number; // minimum acceptable ratio
  min_sample: number; // require denominator >= this before alerting
  label: string;
}

const FUNNEL: FunnelStep[] = [
  { key: "survey_to_teaser", numerator: "teaser_viewed", denominator: "survey_started", threshold: 0.4, min_sample: 20, label: "Survey → Teaser" },
  { key: "teaser_to_email", numerator: "email_collected", denominator: "teaser_viewed", threshold: 0.3, min_sample: 15, label: "Teaser → Email" },
  { key: "email_to_report", numerator: "report_viewed", denominator: "email_collected", threshold: 0.5, min_sample: 10, label: "Email → Rapport" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronToken = req.headers.get("x-cron-token");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  if (cronToken) {
    const { data: tok } = await supabase.rpc("get_health_check_cron_token").single<string>();
    if (!tok || tok !== cronToken) {
      return new Response(JSON.stringify({ error: "Invalid cron token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const eventNames = [...new Set(FUNNEL.flatMap((s) => [s.numerator, s.denominator]))];

  // Count distinct visitor_day_hash per event (fall back to event count)
  const counts = new Map<string, number>();
  for (const name of eventNames) {
    const { count } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", name)
      .gte("created_at", since);
    counts.set(name, count ?? 0);
  }

  const issues: Array<{ step: FunnelStep; ratio: number; num: number; den: number }> = [];
  const summary: Array<{ step: FunnelStep; ratio: number; num: number; den: number; ok: boolean }> = [];

  for (const step of FUNNEL) {
    const num = counts.get(step.numerator) ?? 0;
    const den = counts.get(step.denominator) ?? 0;
    const ratio = den > 0 ? num / den : 1;
    const failing = den >= step.min_sample && ratio < step.threshold;
    summary.push({ step, ratio, num, den, ok: !failing });
    if (failing) issues.push({ step, ratio, num, den });
  }

  // Always persist a daily summary row
  const alertId = `conv_${Date.now().toString(36)}`;
  let mailResult: { ok: boolean; error?: string } | null = null;

  if (issues.length > 0) {
    const chatPrompt = `Fixa konverteringslarm ${alertId}: ${issues
      .map((i) => `${i.step.label} ${(i.ratio * 100).toFixed(0)}% (${i.num}/${i.den}, tröskel ${(i.step.threshold * 100).toFixed(0)}%)`)
      .join(" | ")}. Kolla relevanta edge functions + frontend-event-tracking.`;

    mailResult = await sendChatAlert({
      subject: `Konverteringsfall: ${issues.map((i) => i.step.label).join(", ")}`,
      intro: `Senaste 24h har följande funnel-steg gått under acceptansnivå:`,
      sections: [{
        title: "Funnel-status",
        rows: summary.map((s) => ({
          label: s.step.label,
          value: `${(s.ratio * 100).toFixed(0)}% (${s.num}/${s.den}, tröskel ${(s.step.threshold * 100).toFixed(0)}%)`,
          severity: s.ok ? undefined : "error",
        })),
      }],
      chatPrompt,
      alertId,
    });
  }

  await supabase.from("system_health_log").insert({
    check_name: "conversion-funnel-24h",
    status: issues.length > 0 ? "error" : "ok",
    error_message: issues.length > 0 ? issues.map((i) => `${i.step.label}=${(i.ratio * 100).toFixed(0)}%`).join("; ") : null,
    details: { summary: summary.map((s) => ({ step: s.step.key, ratio: s.ratio, num: s.num, den: s.den, ok: s.ok })) },
    alert_sent_at: mailResult?.ok ? new Date().toISOString() : null,
    alert_id: issues.length > 0 ? alertId : null,
  });

  return new Response(JSON.stringify({ ok: true, issues: issues.length, summary, mail: mailResult }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
