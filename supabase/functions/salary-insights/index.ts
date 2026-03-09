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
      .select("yrke, kommun, current_salary, salary_type, employment_type")
      .not("current_salary", "is", null)
      .not("yrke", "is", null);

    if (error) throw error;

    // Aggregate by role
    const byRole: Record<string, { salaries: number[]; count: number }> = {};
    // Aggregate by kommun
    const byKommun: Record<string, { salaries: number[]; count: number }> = {};
    // Aggregate by role + kommun
    const byRoleKommun: Record<string, { salaries: number[]; count: number; role: string; kommun: string }> = {};

    for (const lead of leads || []) {
      if (!lead.current_salary || !lead.yrke) continue;

      // Normalize hourly: if monthly, divide by 167
      const hourly =
        lead.salary_type === "monthly"
          ? Math.round(lead.current_salary / 167)
          : lead.current_salary;

      // By role
      if (!byRole[lead.yrke]) byRole[lead.yrke] = { salaries: [], count: 0 };
      byRole[lead.yrke].salaries.push(hourly);
      byRole[lead.yrke].count++;

      // By kommun
      if (lead.kommun) {
        if (!byKommun[lead.kommun]) byKommun[lead.kommun] = { salaries: [], count: 0 };
        byKommun[lead.kommun].salaries.push(hourly);
        byKommun[lead.kommun].count++;

        // By role + kommun
        const key = `${lead.yrke}||${lead.kommun}`;
        if (!byRoleKommun[key])
          byRoleKommun[key] = { salaries: [], count: 0, role: lead.yrke, kommun: lead.kommun };
        byRoleKommun[key].salaries.push(hourly);
        byRoleKommun[key].count++;
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

    const roleStats = Object.entries(byRole)
      .map(([role, d]) => ({ role, count: d.count, ...stats(d.salaries) }))
      .sort((a, b) => b.count - a.count);

    const kommunStats = Object.entries(byKommun)
      .map(([kommun, d]) => ({ kommun, count: d.count, ...stats(d.salaries) }))
      .sort((a, b) => b.count - a.count);

    const roleKommunStats = Object.values(byRoleKommun)
      .filter((d) => d.count >= 2)
      .map((d) => ({ role: d.role, kommun: d.kommun, count: d.count, ...stats(d.salaries) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return new Response(
      JSON.stringify({
        total_leads_with_salary: (leads || []).filter((l) => l.current_salary && l.yrke).length,
        by_role: roleStats,
        by_kommun: kommunStats,
        by_role_kommun: roleKommunStats,
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
