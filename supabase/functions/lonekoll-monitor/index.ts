// Lönekoll monitor — runs daily ~07:15 via pg_cron.
//
// Two checks (last 24h):
//  1. RAG-svar med fel: antal `lonekoll_answer_reported` > THRESHOLD_REPORTS.
//  2. E-postgate-konvertering: email_gate_completed / topic_selected
//     (unika besökare) under MIN_RATIO när topic_selected >= MIN_SAMPLE.
// Dedup: samma check skickas inte oftare än 1×/dygn (system_health_log.alert_sent_at).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendChatAlert } from "../_shared/alertMail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const THRESHOLD_REPORTS = 3;      // >3 felrapporter på 24h
const MIN_RATIO = 0.25;           // <25% av topic-klick gav e-post
const MIN_SAMPLE = 30;            // kräv minst 30 topic-klick innan vi larmar
const DEDUP_HOURS = 22;           // skicka inte oftare än ~1×/dygn per check

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

  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("event_name, metadata, created_at")
    .in("event_name", [
      "lonekoll_topic_selected",
      "lonekoll_question_selected",
      "lonekoll_email_gate_completed",
      "lonekoll_answer_reported",
    ])
    .gte("created_at", since)
    .limit(50000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let topicClicks = 0;
  let emailGate = 0;
  const reports = new Map<string, number>(); // key: topicId:questionId

  for (const e of events ?? []) {
    const m = (e.metadata ?? {}) as Record<string, unknown>;
    if (e.event_name === "lonekoll_topic_selected") topicClicks++;
    else if (e.event_name === "lonekoll_email_gate_completed") emailGate++;
    else if (e.event_name === "lonekoll_answer_reported") {
      const key = `${m.topic_id ?? "?"}:${m.question_id ?? "?"}`;
      reports.set(key, (reports.get(key) ?? 0) + 1);
    }
  }

  const totalReports = [...reports.values()].reduce((a, b) => a + b, 0);
  const ratio = topicClicks > 0 ? emailGate / topicClicks : 1;
  const conversionFailing = topicClicks >= MIN_SAMPLE && ratio < MIN_RATIO;
  const reportsFailing = totalReports > THRESHOLD_REPORTS;

  // Dedup
  const dedupSince = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("system_health_log")
    .select("check_name")
    .in("check_name", ["lonekoll-monitor:reports", "lonekoll-monitor:conversion"])
    .gte("created_at", dedupSince)
    .not("alert_sent_at", "is", null);
  const recentNames = new Set((recent ?? []).map((r: any) => r.check_name));

  const alerts: Array<{ check: string; label: string; value: string }> = [];
  if (reportsFailing && !recentNames.has("lonekoll-monitor:reports")) {
    const top = [...reports.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    alerts.push({
      check: "lonekoll-monitor:reports",
      label: `RAG-svar: ${totalReports} felrapporter (24h)`,
      value: top.map(([k, n]) => `${k}=${n}`).join(", "),
    });
  }
  if (conversionFailing && !recentNames.has("lonekoll-monitor:conversion")) {
    alerts.push({
      check: "lonekoll-monitor:conversion",
      label: `E-postgate-konvertering`,
      value: `${(ratio * 100).toFixed(0)}% (${emailGate}/${topicClicks}, tröskel ${(MIN_RATIO * 100).toFixed(0)}%)`,
    });
  }

  if (alerts.length === 0) {
    return new Response(JSON.stringify({
      ok: true,
      topic_clicks: topicClicks,
      email_gate: emailGate,
      ratio,
      total_reports: totalReports,
      suppressed: (reportsFailing || conversionFailing),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const alertId = `lk_${Date.now().toString(36)}`;
  const chatPrompt = `Fixa lonekoll-larm ${alertId}: ${alerts.map((a) => `${a.label} – ${a.value}`).join(" | ")}. Kolla lonekoll-answer logs + LonekollHealth-vyn på /admin.`;

  const mail = await sendChatAlert({
    subject: `Lönekoll: ${alerts.map((a) => a.label).join(", ")}`,
    intro: `Senaste 24h har Lönekoll-mätningarna passerat larmnivå:`,
    sections: [{
      title: "Larm",
      rows: alerts.map((a) => ({ label: a.label, value: a.value, severity: "error" as const })),
    }, {
      title: "Volymer (24h)",
      rows: [
        { label: "Topic-klick", value: String(topicClicks) },
        { label: "E-postgate klar", value: String(emailGate) },
        { label: "Konvertering", value: `${(ratio * 100).toFixed(0)}%` },
        { label: "Felrapporter totalt", value: String(totalReports) },
      ],
    }],
    chatPrompt,
    alertId,
  });

  await supabase.from("system_health_log").insert(
    alerts.map((a) => ({
      check_name: a.check,
      status: "error",
      error_message: `${a.label}: ${a.value}`,
      details: { topic_clicks: topicClicks, email_gate: emailGate, ratio, total_reports: totalReports },
      alert_sent_at: mail.ok ? new Date().toISOString() : null,
      alert_id: alertId,
    })),
  );

  return new Response(JSON.stringify({ alert_id: alertId, alerts: alerts.map((a) => a.check), mail }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
