import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const metrics = [
    { key: "amount", label: "Timpris (kr/h)", description: "Ramavtalspris per timme som kunden betalar", capabilities: ["lookup_rate", "compare_roles"], unit: "SEK", unit_type: "per_hour" },
    { key: "recommended_monthly_min", label: "Rekommenderat månadsarvode (min)", description: "Beräknad lägsta månadsersättning baserat på marginalmodell", capabilities: ["lookup_rate"], unit: "SEK", unit_type: "per_month" },
    { key: "recommended_monthly_max", label: "Rekommenderat månadsarvode (max)", description: "Beräknad högsta månadsersättning baserat på marginalmodell", capabilities: ["lookup_rate"], unit: "SEK", unit_type: "per_month" },
    { key: "mean_salary", label: "Medellön", description: "Genomsnittlig månadslön för fast anställda", capabilities: ["salary_benchmark", "salary_position"], unit: "SEK", unit_type: "per_month" },
    { key: "median_salary", label: "Medianlön", description: "Medianlön för fast anställda (50:e percentilen)", capabilities: ["salary_benchmark", "salary_position"], unit: "SEK", unit_type: "per_month" },
    { key: "p25_salary", label: "P25 — Undre kvartil", description: "25:e percentilen av lönefördelningen", capabilities: ["salary_benchmark", "salary_position"], unit: "SEK", unit_type: "per_month" },
    { key: "p75_salary", label: "P75 — Övre kvartil", description: "75:e percentilen av lönefördelningen", capabilities: ["salary_benchmark", "salary_position"], unit: "SEK", unit_type: "per_month" },
    { key: "difference_amount", label: "Skillnad (belopp)", description: "Absolut skillnad mellan jämförda värden", capabilities: ["compare_roles", "salary_position"], unit: "SEK", unit_type: "absolute" },
    { key: "difference_percent", label: "Skillnad (%)", description: "Procentuell skillnad mellan jämförda värden", capabilities: ["compare_roles", "salary_position"], unit: "%", unit_type: "percentage" },
  ];

  const comparisons = [
    { key: "role_vs_role", label: "Jämför roller", description: "Jämför ramavtalspriser mellan två yrkesroller", capability: "compare_roles", required_params: ["role_a", "role_b", "geography", "employment_type"] },
    { key: "geography_vs_geography", label: "Jämför geografier", description: "Jämför samma roll i två olika kommuner/regioner", capability: "compare_roles", required_params: ["role_a", "role_b", "geography", "geography_b", "employment_type"], note: "Sätt role_a = role_b för renodlad geografisk jämförelse" },
    { key: "salary_vs_benchmark", label: "Lönepositionering", description: "Jämför angiven lön mot benchmark-percentiler (p25/p50/p75)", capability: "salary_position", required_params: ["role", "sector", "current_salary"] },
  ];

  return new Response(
    JSON.stringify({ metrics, comparisons }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
