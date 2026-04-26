import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof Response) return adminCheck;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Total events in last 24h
    const { count: totalEvents, error: countErr } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);

    if (countErr) throw countErr;

    // Pull events to compute unique leads + top events
    const { data: events, error: eventsErr } = await supabase
      .from("analytics_events")
      .select("event_name, lead_id")
      .gte("created_at", since)
      .limit(10000);

    if (eventsErr) throw eventsErr;

    const uniqueLeads = new Set<string>();
    const eventCounts: Record<string, number> = {};
    for (const e of events ?? []) {
      if (e.lead_id) uniqueLeads.add(e.lead_id);
      eventCounts[e.event_name] = (eventCounts[e.event_name] ?? 0) + 1;
    }

    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([event_name, count]) => ({ event_name, count }));

    const warnings: string[] = [];
    if ((totalEvents ?? 0) === 0) {
      warnings.push("⚠️ Zero analytics_events in last 24h — tracking may be broken or no traffic.");
    }
    if (uniqueLeads.size === 0 && (totalEvents ?? 0) > 0) {
      warnings.push("⚠️ Events present but no lead_id — funnel attribution broken.");
    }

    const status = warnings.length === 0 ? "✅" : "⚠️";

    return new Response(
      JSON.stringify({
        status,
        window_hours: 24,
        total_events: totalEvents ?? 0,
        unique_leads: uniqueLeads.size,
        top_events: topEvents,
        warnings,
        checked_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[posthog-health-check] error:", err);
    return new Response(
      JSON.stringify({ status: "❌", error: err?.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
