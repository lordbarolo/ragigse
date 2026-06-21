// Edge error monitor — runs every 15 min via pg_cron.
//
// Reads public.edge_function_errors for last 15 min. If any single function
// has >3 errors, send a chat-ready alert email. Dedup: same function won't be
// alerted again within 60 min.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendChatAlert } from "../_shared/alertMail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const THRESHOLD = 3;
const WINDOW_MIN = 15;
const DEDUP_MIN = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: cron-token (preferred) or service role bearer
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

  const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();
  const { data: errors, error } = await supabase
    .from("edge_function_errors")
    .select("function_name, error_message, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Aggregate per function
  const counts = new Map<string, { count: number; sample: string }>();
  for (const e of errors ?? []) {
    const cur = counts.get(e.function_name) ?? { count: 0, sample: e.error_message };
    cur.count += 1;
    counts.set(e.function_name, cur);
  }

  const offenders = [...counts.entries()].filter(([, v]) => v.count > THRESHOLD);

  if (offenders.length === 0) {
    return new Response(JSON.stringify({ ok: true, errors_in_window: errors?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Dedup: skip functions alerted within last DEDUP_MIN minutes
  const dedupSince = new Date(Date.now() - DEDUP_MIN * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("system_health_log")
    .select("check_name")
    .eq("status", "error")
    .gte("created_at", dedupSince)
    .not("alert_sent_at", "is", null);
  const recentNames = new Set((recent ?? []).map((r: any) => r.check_name));

  const fresh = offenders.filter(([name]) => !recentNames.has(`edge-error:${name}`));
  if (fresh.length === 0) {
    return new Response(JSON.stringify({ ok: true, suppressed: offenders.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const alertId = `err_${Date.now().toString(36)}`;
  const chatPrompt = `Fixa edge-fel ${alertId}: ${fresh.map(([n, v]) => `${n} (${v.count}x) – ${v.sample.slice(0, 120)}`).join(" | ")}. Loggar i edge_function_errors.`;

  const mail = await sendChatAlert({
    subject: `Edge-fel: ${fresh.map(([n]) => n).join(", ")}`,
    intro: `Senaste ${WINDOW_MIN} min har följande funktioner kastat fler än ${THRESHOLD} fel:`,
    sections: [{
      title: "Funktioner med felflod",
      rows: fresh.map(([name, v]) => ({
        label: `${name} (${v.count} fel)`,
        value: v.sample.slice(0, 200),
        severity: "error" as const,
      })),
    }],
    chatPrompt,
    alertId,
  });

  // Persist a health-log row so dedup works
  await supabase.from("system_health_log").insert(
    fresh.map(([name, v]) => ({
      check_name: `edge-error:${name}`,
      status: "error",
      error_message: `${v.count}x: ${v.sample.slice(0, 200)}`,
      details: { count: v.count, window_min: WINDOW_MIN },
      alert_sent_at: mail.ok ? new Date().toISOString() : null,
      alert_id: alertId,
    }))
  );

  return new Response(JSON.stringify({ alert_id: alertId, alerted: fresh.map(([n]) => n), mail }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
