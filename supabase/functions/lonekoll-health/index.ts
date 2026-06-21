// Admin-only: aggregated usage stats for Lönekoll v2.
// Returns counts per topic/question (last 30d) from analytics_events,
// plus missing-question reports and answer reports.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("event_name, metadata, created_at")
    .in("event_name", [
      "lonekoll_email_gate_completed",
      "lonekoll_topic_selected",
      "lonekoll_question_selected",
      "lonekoll_answer_reported",
      "lonekoll_missing_question_reported",
    ])
    .gte("created_at", since)
    .limit(50000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const topicCounts: Record<string, number> = {};
  const questionCounts: Record<string, number> = {}; // key: `${topicId}:${questionId}`
  const reportCounts: Record<string, number> = {};
  let emailGate = 0;
  let missing = 0;

  for (const e of events ?? []) {
    const m = (e.metadata ?? {}) as Record<string, unknown>;
    if (e.event_name === "lonekoll_email_gate_completed") emailGate++;
    else if (e.event_name === "lonekoll_topic_selected") {
      const t = String(m.topic_id ?? "?");
      topicCounts[t] = (topicCounts[t] ?? 0) + 1;
    } else if (e.event_name === "lonekoll_question_selected") {
      const key = `${m.topic_id ?? "?"}:${m.question_id ?? "?"}`;
      questionCounts[key] = (questionCounts[key] ?? 0) + 1;
    } else if (e.event_name === "lonekoll_answer_reported") {
      const key = `${m.topic_id ?? "?"}:${m.question_id ?? "?"}`;
      reportCounts[key] = (reportCounts[key] ?? 0) + 1;
    } else if (e.event_name === "lonekoll_missing_question_reported") {
      missing++;
    }
  }

  // Latest missing-question reports from chat_answer_reports (source = 'lonekoll')
  const { data: chatReports } = await supabase
    .from("chat_answer_reports")
    .select("id, created_at, reason, metadata")
    .eq("source", "lonekoll")
    .order("created_at", { ascending: false })
    .limit(20);

  return new Response(
    JSON.stringify({
      since,
      totals: {
        events: events?.length ?? 0,
        email_gate_completed: emailGate,
        missing_question_reported: missing,
      },
      topics: topicCounts,
      questions: questionCounts,
      reports: reportCounts,
      recent_chat_reports: chatReports ?? [],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
