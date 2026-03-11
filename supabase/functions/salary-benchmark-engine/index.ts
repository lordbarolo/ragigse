import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GapCategory = "small" | "medium" | "large";

function categorizeGap(currentSalary: number, p75: number): GapCategory {
  const gap = p75 - currentSalary;
  const gapPct = gap / currentSalary;
  if (gapPct <= 0.05) return "small";
  if (gapPct <= 0.15) return "medium";
  return "large";
}

// Map survey occupation names to DB occupation names
const OCCUPATION_MAP: Record<string, string> = {
  "Sjuksköterska": "Grundutbildade sjuksköterskor",
  "Allmänsjuksköterska": "Grundutbildade sjuksköterskor",
  "Barnmorska": "Barnmorskor",
  "Specialistsjuksköterska": "Övriga specialistsjuksköterskor",
  "Legitimerad läkare": "Övriga läkare",
  "Specialistläkare": "Specialistläkare",
  "ST-läkare": "ST-läkare",
  "Anestesisjuksköterska": "Anestesisjuksköterskor",
  "Intensivvårdssjuksköterska": "Intensivvårdssjuksköterskor",
  "Operationssjuksköterska": "Operationssjuksköterskor",
  "Barnsjuksköterska": "Barnsjuksköterskor",
  "Ambulanssjuksköterska": "Ambulanssjuksköterskor m.fl.",
  "Distriktssköterska": "Distriktssköterskor",
  "Psykiatrisjuksköterska": "Psykiatrisjuksköterskor",
  "Röntgensjuksköterska": "Röntgensjuksköterskor",
  "Skolsköterska": "Skolsköterskor",
  "Geriatriksjuksköterska": "Geriatriksjuksköterskor",
  "Företagssköterska": "Företagssköterskor",
  "Psykolog": "Psykologer",
  "AT-läkare": "AT-läkare",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { occupation: rawOccupation, sector, current_salary } = await req.json();
    const occupation = OCCUPATION_MAP[rawOccupation] || rawOccupation;

    if (!occupation || !sector) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: occupation, sector" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const selectCols = "occupation, sector, average_monthly, percentile_25, percentile_50, percentile_75, region, year, source";

    // 1. Exact match
    let { data, error } = await supabase
      .from("salary_benchmarks")
      .select(selectCols)
      .eq("occupation", occupation)
      .eq("sector", sector)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Fuzzy ILIKE — e.g. "Barnmorska" matches "Barnmorskor"
    if (!data && !error) {
      const res = await supabase
        .from("salary_benchmarks")
        .select(selectCols)
        .eq("sector", sector)
        .ilike("occupation", `%${occupation}%`)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res.data) data = res.data;
    }

    // 3. Prefix/ILIKE fallback — e.g. "Specialistläkare akutsjukvård" → "%akutsjukvård%"
    if (!data && !error) {
      const parts = occupation.split(" ");
      if (parts.length > 1) {
        const suffix = parts.slice(1).join(" ");
        const res = await supabase
          .from("salary_benchmarks")
          .select(selectCols)
          .eq("sector", sector)
          .ilike("occupation", `%${suffix}%`)
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (res.data) data = res.data;
      }
    }

    // 4. Broad category fallback — e.g. "Specialistläkare" or "Sjuksköterska"
    if (!data && !error) {
      const mainCategory = occupation.split(" ")[0];
      if (mainCategory) {
        const res = await supabase
          .from("salary_benchmarks")
          .select(selectCols)
          .eq("sector", sector)
          .ilike("occupation", `${mainCategory}%`)
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (res.data) data = res.data;
      }
    }

    // 5. Stem fallback — e.g. "Barnmorska" -> "%barnmorsk%"
    if (!data && !error) {
      const stem = occupation
        .trim()
        .toLowerCase()
        .replace(/(orna|arna|erna|or|ar|er|a|e|n)$/u, "");

      if (stem.length >= 4) {
        const res = await supabase
          .from("salary_benchmarks")
          .select(selectCols)
          .eq("sector", sector)
          .ilike("occupation", `%${stem}%`)
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (res.data) data = res.data;
      }
    }

    // 6. Cross-sector fallback — try any sector
    if (!data && !error) {
      const res = await supabase
        .from("salary_benchmarks")
        .select(selectCols)
        .ilike("occupation", `%${occupation}%`)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res.data) data = res.data;
    }

    if (!data) {
      const stem = occupation
        .trim()
        .toLowerCase()
        .replace(/(orna|arna|erna|or|ar|er|a|e|n)$/u, "");

      if (stem.length >= 4) {
        const stemAnySector = await supabase
          .from("salary_benchmarks")
          .select(selectCols)
          .ilike("occupation", `%${stem}%`)
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (stemAnySector.data) {
          data = stemAnySector.data;
        }
      }
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "No benchmark data available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const p25 = data.percentile_25 ?? Math.round(data.average_monthly * 0.92);
    const p50 = data.percentile_50 ?? data.average_monthly;
    const p75 = data.percentile_75 ?? Math.round(data.average_monthly * 1.08);

    const result: Record<string, unknown> = {
      occupation: data.occupation,
      sector: data.sector,
      region: data.region,
      year: data.year,
      source: data.source,
      percentile_25: p25,
      percentile_50: p50,
      percentile_75: p75,
    };

    if (current_salary && current_salary > 0) {
      const gap = p75 - current_salary;
      result.current_salary = current_salary;
      result.gap_vs_p75 = gap;
      result.gap_pct = Math.round((gap / current_salary) * 100);
      result.category = categorizeGap(current_salary, p75);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("salary-benchmark-engine error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
