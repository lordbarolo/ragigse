import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Parse optional date filters from body
    let fromDate: string | null = null;
    let toDate: string | null = null;
    try {
      const body = await req.json();
      fromDate = body?.from || null;
      toDate = body?.to || null;
    } catch { /* no body */ }

    // Fetch analytics events with optional date filter
    let query = supabase
      .from("analytics_events")
      .select("event_name, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00Z`);
    if (toDate) query = query.lte("created_at", `${toDate}T23:59:59Z`);

    const { data: events, error } = await query;

    if (error) throw error;

    // Define funnel steps matching current user flow
    const funnelSteps = [
      "landing_viewed",
      "survey_started",
      "survey_completed",
      "analysis_started",
      "email_collected",
      "report_viewed",
      "report_section_viewed",
    ];

    // Aggregate by variant
    const variants: Record<string, Record<string, number>> = { A: {}, B: {}, unknown: {} };
    const referralEvents: Record<string, { sent: number; confirmed: number }> = {
      A: { sent: 0, confirmed: 0 },
      B: { sent: 0, confirmed: 0 },
      unknown: { sent: 0, confirmed: 0 },
    };

    // Revenue tracking (count payment_verified as conversions)
    const revenueByVariant: Record<string, number> = { A: 0, B: 0, unknown: 0 };

    // Daily event counts for time series
    const dailyCounts: Record<string, Record<string, number>> = {};

    for (const event of events || []) {
      const meta = event.metadata as Record<string, unknown> | null;
      const variant = (meta?.ab_variant as string) || "unknown";
      const variantKey = variant === "A" || variant === "B" ? variant : "unknown";

      // Funnel counts
      if (!variants[variantKey]) variants[variantKey] = {};
      variants[variantKey][event.event_name] = (variants[variantKey][event.event_name] || 0) + 1;

      // Referral counts
      if (event.event_name === "referral_sent") {
        referralEvents[variantKey].sent++;
      } else if (event.event_name === "referral_confirmed") {
        referralEvents[variantKey].confirmed++;
      }

      // Revenue (each payment_verified = 1 conversion)
      if (event.event_name === "payment_verified") {
        revenueByVariant[variantKey]++;
      }

      // Daily breakdown
      const day = event.created_at.slice(0, 10);
      if (!dailyCounts[day]) dailyCounts[day] = {};
      dailyCounts[day][event.event_name] = (dailyCounts[day][event.event_name] || 0) + 1;
    }

    // Build funnel for each variant
    const funnels: Record<string, Array<{ step: string; count: number; rate: number }>> = {};
    for (const v of ["A", "B"]) {
      const counts = variants[v] || {};
      const funnel = funnelSteps.map((step, i) => {
        const count = counts[step] || 0;
        const prevCount = i === 0 ? count : (counts[funnelSteps[i - 1]] || 0);
        const rate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
        return { step, count, rate: i === 0 ? 100 : rate };
      });
      funnels[v] = funnel;
    }

    // Conversion rates
    const conversionRates: Record<string, { sessions: number; conversions: number; rate: string }> = {};
    for (const v of ["A", "B"]) {
      const sessions = variants[v]?.["teaser_viewed"] || 0;
      const conversions = variants[v]?.["payment_verified"] || 0;
      conversionRates[v] = {
        sessions,
        conversions,
        rate: sessions > 0 ? (conversions / sessions * 100).toFixed(1) + "%" : "0%",
      };
    }

    // Sort daily counts
    const sortedDays = Object.keys(dailyCounts).sort();
    const timeSeries = sortedDays.map((day) => ({
      date: day,
      events: dailyCounts[day],
    }));

    return new Response(
      JSON.stringify({
        funnels,
        conversionRates,
        referralEvents,
        revenueByVariant,
        timeSeries,
        totalEvents: (events || []).length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
