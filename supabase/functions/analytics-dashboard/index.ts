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

  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    let fromDate: string | null = null;
    let toDate: string | null = null;
    try {
      const body = await req.json();
      fromDate = body?.from || null;
      toDate = body?.to || null;
    } catch { /* no body */ }

    let query = supabase
      .from("analytics_events")
      .select("event_name, metadata, created_at, visitor_day_hash")
      .order("created_at", { ascending: false })
      .limit(100000);

    if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00Z`);
    if (toDate) query = query.lte("created_at", `${toDate}T23:59:59Z`);

    const { data: events, error } = await query;
    if (error) throw error;

    // Funnel with explicit signup-loop steps
    const funnelSteps = [
      "landing_viewed",
      "survey_started",
      "survey_completed",
      "email_collected",
      "report_viewed",
      "signup_initiated",
      "signup_confirmed",
      "signup_completed",
    ];

    // Aggregate: distinct visitor_day_hash per step (true unique), and raw counts.
    const uniqueSets: Record<string, Set<string>> = {};
    const rawCounts: Record<string, number> = {};
    const dailyVisitors: Record<string, Set<string>> = {};
    const dailyEvents: Record<string, Record<string, number>> = {};
    const referralEvents = { sent: 0, confirmed: 0 };

    for (const e of events || []) {
      const name = e.event_name as string;
      const hash = (e.visitor_day_hash as string | null) || `legacy:${e.created_at}`;
      const day = (e.created_at as string).slice(0, 10);

      rawCounts[name] = (rawCounts[name] || 0) + 1;
      if (!uniqueSets[name]) uniqueSets[name] = new Set();
      uniqueSets[name].add(hash);

      if (!dailyEvents[day]) dailyEvents[day] = {};
      dailyEvents[day][name] = (dailyEvents[day][name] || 0) + 1;

      if (!dailyVisitors[day]) dailyVisitors[day] = new Set();
      if (name === "landing_viewed" || name === "page_view" || name === "page_viewed") {
        dailyVisitors[day].add(hash);
      }

      if (name === "referral_sent") referralEvents.sent++;
      else if (name === "referral_confirmed") referralEvents.confirmed++;
    }

    const funnel = funnelSteps.map((step, i) => {
      const unique = uniqueSets[step]?.size || 0;
      const raw = rawCounts[step] || 0;
      const prevUnique = i === 0 ? unique : (uniqueSets[funnelSteps[i - 1]]?.size || 0);
      const rate = prevUnique > 0 ? Math.round((unique / prevUnique) * 100) : 0;
      const dropoff = i === 0 ? 0 : Math.max(0, prevUnique - unique);
      return { step, unique, raw, rate: i === 0 ? 100 : rate, dropoff };
    });

    const uniqueLanding = uniqueSets["landing_viewed"]?.size || 0;
    const uniqueSignups = uniqueSets["signup_confirmed"]?.size || 0;
    const overallRate = uniqueLanding > 0
      ? ((uniqueSignups / uniqueLanding) * 100).toFixed(1) + "%"
      : "0%";

    const sortedDays = Object.keys(dailyEvents).sort();
    const timeSeries = sortedDays.map((day) => ({
      date: day,
      unique_visitors: dailyVisitors[day]?.size || 0,
      events: dailyEvents[day],
    }));

    return new Response(
      JSON.stringify({
        funnel,
        kpis: {
          unique_visitors: uniqueLanding,
          unique_signups: uniqueSignups,
          overall_rate: overallRate,
          total_events: (events || []).length,
        },
        referralEvents,
        timeSeries,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
