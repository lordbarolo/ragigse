import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EventRow {
  event_name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

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
    let hours = 168; // 7 days default
    try {
      const body = await req.json();
      if (typeof body?.hours === "number" && body.hours > 0 && body.hours <= 24 * 30) {
        hours = body.hours;
      }
    } catch { /* no body */ }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_name, metadata, created_at")
      .in("event_name", [
        "survey_mounted",
        "survey_prefill_failed",
        "landing_viewed",
        "hero_cta_clicked",
        "survey_started",
      ])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const events = (data ?? []) as EventRow[];

    // Aggregate: count of mounts per (initial_category, initial_role) combo
    const mountBreakdown: Record<string, { count: number; with_category: number; without_category: number }> = {};
    let mounts = 0;
    let mountsWithoutCategory = 0;
    for (const e of events) {
      if (e.event_name !== "survey_mounted") continue;
      mounts++;
      const cat = (e.metadata?.initial_category as string | null) ?? "—";
      const role = (e.metadata?.initial_role as string | null) ?? "—";
      const key = `${cat} / ${role}`;
      const bucket = mountBreakdown[key] ?? { count: 0, with_category: 0, without_category: 0 };
      bucket.count++;
      if (e.metadata?.has_initial_category) bucket.with_category++;
      else {
        bucket.without_category++;
        mountsWithoutCategory++;
      }
      mountBreakdown[key] = bucket;
    }

    // Failed prefill: aggregate by yrke slug
    const failedSlugs: Record<string, number> = {};
    let failedTotal = 0;
    for (const e of events) {
      if (e.event_name !== "survey_prefill_failed") continue;
      failedTotal++;
      const slug = (e.metadata?.yrke as string | null) ?? "—";
      failedSlugs[slug] = (failedSlugs[slug] ?? 0) + 1;
    }

    // Recent stream (latest 80 entries from the relevant events)
    const recent = events.slice(0, 80).map((e) => ({
      event_name: e.event_name,
      created_at: e.created_at,
      metadata: e.metadata,
    }));

    const totals = {
      landing_viewed: 0,
      hero_cta_clicked: 0,
      survey_mounted: mounts,
      survey_started: 0,
      survey_prefill_failed: failedTotal,
    } as Record<string, number>;
    for (const e of events) {
      if (e.event_name in totals && e.event_name !== "survey_mounted" && e.event_name !== "survey_prefill_failed") {
        totals[e.event_name]++;
      }
    }

    return new Response(
      JSON.stringify({
        window_hours: hours,
        since,
        totals,
        mounts_without_category: mountsWithoutCategory,
        mount_breakdown: Object.entries(mountBreakdown)
          .map(([key, v]) => ({ key, ...v }))
          .sort((a, b) => b.count - a.count),
        failed_slugs: Object.entries(failedSlugs)
          .map(([slug, count]) => ({ slug, count }))
          .sort((a, b) => b.count - a.count),
        recent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[admin-survey-prefill-debug]", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
