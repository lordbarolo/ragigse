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
    {
      key: "hourly_rate",
      label: "Timpris (kr/h)",
      description: "Ramavtalspris per timme som kunden betalar till bemanningsföretaget",
      capabilities: ["lookup_rate", "compare_roles"],
      unit: "SEK/h",
    },
    {
      key: "monthly_salary",
      label: "Månadslön (kr/mån)",
      description: "Beräknad månadslön baserat på timpris, marginalmodell och anställningsform",
      capabilities: ["lookup_rate", "compare_roles"],
      unit: "SEK/mån",
    },
    {
      key: "percentile_25",
      label: "P25 — Undre kvartil",
      description: "25:e percentilen av lönefördelningen för fast anställda",
      capabilities: ["salary_benchmark", "salary_position"],
      unit: "SEK/mån",
    },
    {
      key: "percentile_50",
      label: "P50 — Median",
      description: "Medianlön för fast anställda (50:e percentilen)",
      capabilities: ["salary_benchmark", "salary_position"],
      unit: "SEK/mån",
    },
    {
      key: "percentile_75",
      label: "P75 — Övre kvartil",
      description: "75:e percentilen av lönefördelningen för fast anställda",
      capabilities: ["salary_benchmark", "salary_position"],
      unit: "SEK/mån",
    },
    {
      key: "gap_vs_p75",
      label: "Gap mot P75",
      description: "Skillnad mellan angiven lön och 75:e percentilen, i kronor och procent",
      capabilities: ["salary_position"],
      unit: "SEK/mån",
    },
  ];

  const comparisons = [
    {
      key: "role_vs_role",
      label: "Jämför roller",
      description: "Jämför ramavtalspriser och rekommenderat arvode mellan två yrkesroller",
      capability: "compare_roles",
      required_params: ["role_a", "role_b", "geography", "employment_type"],
    },
    {
      key: "geography_vs_geography",
      label: "Jämför geografier",
      description: "Jämför samma roll i två olika kommuner/regioner",
      capability: "compare_roles",
      required_params: ["role_a", "geography", "geography_b", "employment_type"],
      note: "Sätt role_a = role_b för renodlad geografisk jämförelse",
    },
    {
      key: "salary_vs_benchmark",
      label: "Lönepositionering",
      description: "Jämför angiven lön mot benchmark-percentiler (p25/p50/p75)",
      capability: "salary_position",
      required_params: ["role", "sector", "current_salary"],
    },
  ];

  return new Response(
    JSON.stringify({ metrics, comparisons }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
