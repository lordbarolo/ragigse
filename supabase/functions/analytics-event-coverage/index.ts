import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof Response) return adminCheck;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let days = 30;
    try {
      const url = new URL(req.url);
      const qp = parseInt(url.searchParams.get("days") || "", 10);
      if (!Number.isNaN(qp)) days = qp;
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (typeof body?.days === "number") days = body.days;
      }
    } catch { /* noop */ }
    days = Math.min(Math.max(days, 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Pull events (page through to avoid 1000-row cap)
    const counts: Record<string, number> = {};
    const lastSeen: Record<string, string> = {};
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_name, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const e of data) {
        counts[e.event_name] = (counts[e.event_name] ?? 0) + 1;
        if (!lastSeen[e.event_name]) lastSeen[e.event_name] = e.created_at as string;
      }
      if (data.length < pageSize) break;
      from += pageSize;
      if (from > 50000) break; // safety cap
    }

    const events = Object.entries(counts)
      .map(([event_name, count]) => ({ event_name, count, last_seen: lastSeen[event_name] }))
      .sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({ days, total_distinct: events.length, events }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[analytics-event-coverage]", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
