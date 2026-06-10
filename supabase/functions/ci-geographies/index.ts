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

  // Return geographies from normalized geographies table with hierarchy
  const { data, error } = await supabase
    .from("geographies")
    .select("id, type, name, code, parent_id")
    .order("name");

  if (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const all = data || [];

  const nations = all.filter((g) => g.type === "nation");
  const regions = all.filter((g) => g.type === "region");
  const zones = all.filter((g) => g.type === "zone");
  const municipalities = all.filter((g) => g.type === "municipality");

  // Group municipalities by region (parent_id)
  const byRegion: Record<string, { id: string; region: string; municipalities: string[]; zones: string[] }> = {};
  for (const r of regions) {
    byRegion[r.id] = { id: r.id, region: r.name, municipalities: [], zones: [] };
  }

  for (const m of municipalities) {
    if (m.parent_id && byRegion[m.parent_id]) {
      byRegion[m.parent_id].municipalities.push(m.name);
    }
  }

  // Find zone for each municipality via locations table (zones are at nation level, not region)
  // Just list zones separately
  return new Response(
    JSON.stringify({
      total_municipalities: municipalities.length,
      zones: zones.map((z) => z.name).sort(),
      regions: Object.values(byRegion)
        .map((r) => ({
          region: r.region,
          municipalities: r.municipalities.sort(),
        }))
        .sort((a, b) => a.region.localeCompare(b.region, "sv")),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
