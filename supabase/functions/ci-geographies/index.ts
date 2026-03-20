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

  // Return geographies from locations table (names only, no rates)
  const { data, error } = await supabase
    .from("locations")
    .select("kommun, zon, region")
    .order("kommun");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by region
  const byRegion: Record<string, { kommuner: string[]; zoner: string[] }> = {};
  for (const loc of data || []) {
    if (!byRegion[loc.region]) byRegion[loc.region] = { kommuner: [], zoner: [] };
    if (!byRegion[loc.region].kommuner.includes(loc.kommun)) {
      byRegion[loc.region].kommuner.push(loc.kommun);
    }
    if (!byRegion[loc.region].zoner.includes(loc.zon)) {
      byRegion[loc.region].zoner.push(loc.zon);
    }
  }

  const zones = [...new Set((data || []).map((l) => l.zon))].sort();

  return new Response(
    JSON.stringify({
      total_kommuner: (data || []).length,
      zones,
      regions: Object.entries(byRegion).map(([region, info]) => ({
        region,
        kommuner: info.kommuner.sort(),
        zoner: info.zoner.sort(),
      })).sort((a, b) => a.region.localeCompare(b.region, "sv")),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
