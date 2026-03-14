import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all leads with salary data
    const { data: leads, error } = await supabase
      .from("leads")
      .select("yrke, kommun, current_salary, salary_type, employment_type, email, created_at")
      .not("current_salary", "is", null)
      .not("yrke", "is", null)
      .not("salary_type", "is", null)
      .not("email", "eq", "test@compcare.se");

    if (error) throw error;

    // --- Salary aggregation ---
    type Bucket = { salaries: number[]; count: number };
    type RoleKommunBucket = Bucket & { role: string; kommun: string };

    const byRoleType: Record<string, Bucket> = {};
    const byKommunType: Record<string, Bucket> = {};
    const byRoleKommunType: Record<string, RoleKommunBucket> = {};

    // Realistic hourly rate bounds (SEK/h) by employment type
    const BOUNDS: Record<string, { min: number; max: number }> = {
      anstalld:   { min: 200, max: 1500 },
      foretagare: { min: 300, max: 2000 },
    };
    const DEFAULT_BOUNDS = { min: 200, max: 1500 };

    let filtered_out = 0;

    for (const lead of leads || []) {
      if (!lead.current_salary || !lead.yrke) continue;

      const hourly =
        lead.salary_type === "monthly"
          ? Math.round(lead.current_salary / 167)
          : lead.current_salary;

      const et = lead.employment_type || "unknown";
      const bounds = BOUNDS[et] || DEFAULT_BOUNDS;

      // Skip unrealistic values
      if (hourly < bounds.min || hourly > bounds.max) {
        filtered_out++;
        continue;
      }

      // By role + employment_type
      const roleKey = `${lead.yrke}||${et}`;
      if (!byRoleType[roleKey]) byRoleType[roleKey] = { salaries: [], count: 0 };
      byRoleType[roleKey].salaries.push(hourly);
      byRoleType[roleKey].count++;

      // By kommun + employment_type
      if (lead.kommun) {
        const kommunKey = `${lead.kommun}||${et}`;
        if (!byKommunType[kommunKey]) byKommunType[kommunKey] = { salaries: [], count: 0 };
        byKommunType[kommunKey].salaries.push(hourly);
        byKommunType[kommunKey].count++;

        // By role + kommun + employment_type
        const rkKey = `${lead.yrke}||${lead.kommun}||${et}`;
        if (!byRoleKommunType[rkKey])
          byRoleKommunType[rkKey] = { salaries: [], count: 0, role: lead.yrke, kommun: lead.kommun };
        byRoleKommunType[rkKey].salaries.push(hourly);
        byRoleKommunType[rkKey].count++;
      }
    }

    const stats = (salaries: number[]) => {
      if (salaries.length === 0) return { avg: 0, median: 0, min: 0, max: 0 };
      const sorted = [...salaries].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return {
        avg: Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length),
        median: sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
        min: sorted[0],
        max: sorted[sorted.length - 1],
      };
    };

    const roleStats = Object.entries(byRoleType)
      .map(([key, d]) => {
        const [role, employment_type] = key.split("||");
        return { role, employment_type, count: d.count, ...stats(d.salaries) };
      })
      .sort((a, b) => b.count - a.count);

    const kommunStats = Object.entries(byKommunType)
      .map(([key, d]) => {
        const [kommun, employment_type] = key.split("||");
        return { kommun, employment_type, count: d.count, ...stats(d.salaries) };
      })
      .sort((a, b) => b.count - a.count);

    const roleKommunStats = Object.values(byRoleKommunType)
      .filter((d) => d.count >= 2)
      .map((d) => {
        // Extract employment_type from the key by finding this bucket
        const entry = Object.entries(byRoleKommunType).find(([_, v]) => v === d)!;
        const parts = entry[0].split("||");
        const employment_type = parts[2] || "unknown";
        return { role: d.role, kommun: d.kommun, employment_type, count: d.count, ...stats(d.salaries) };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    // --- Repeat survey users ---
    // Group leads by email to find users who submitted more than once
    const byEmail: Record<string, string[]> = {};
    for (const lead of leads || []) {
      if (!lead.email) continue;
      if (!byEmail[lead.email]) byEmail[lead.email] = [];
      byEmail[lead.email].push(lead.created_at);
    }

    let repeatCount = 0;
    const returnDelaysHours: number[] = [];

    for (const [_, timestamps] of Object.entries(byEmail)) {
      if (timestamps.length < 2) continue;
      repeatCount++;
      const sorted = timestamps.map(t => new Date(t).getTime()).sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        returnDelaysHours.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60));
      }
    }

    const avgReturnHours = returnDelaysHours.length > 0
      ? Math.round(returnDelaysHours.reduce((a, b) => a + b, 0) / returnDelaysHours.length)
      : null;
    const medianReturnHours = returnDelaysHours.length > 0
      ? (() => {
          const s = [...returnDelaysHours].sort((a, b) => a - b);
          const m = Math.floor(s.length / 2);
          return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
        })()
      : null;

    return new Response(
      JSON.stringify({
        total_leads_with_salary: (leads || []).filter((l) => l.current_salary && l.yrke).length,
        filtered_out,
        hourly_bounds: BOUNDS,
        by_role: roleStats,
        by_kommun: kommunStats,
        by_role_kommun: roleKommunStats,
        repeat_users: {
          unique_emails: Object.keys(byEmail).length,
          repeat_count: repeatCount,
          total_revisits: returnDelaysHours.length,
          avg_return_hours: avgReturnHours,
          median_return_hours: medianReturnHours,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("salary-insights error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
