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

  // Return distinct canonical role names (no prices, no rates)
  const { data, error } = await supabase
    .from("role_aliases")
    .select("canonical_name")
    .order("canonical_name");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Deduplicate
  const uniqueRoles = [...new Set((data || []).map((r) => r.canonical_name))];

  // Also return aliases grouped by canonical name
  const { data: aliasData } = await supabase
    .from("role_aliases")
    .select("alias, canonical_name")
    .order("alias");

  const aliasMap: Record<string, string[]> = {};
  for (const row of aliasData || []) {
    if (row.alias !== row.canonical_name) {
      if (!aliasMap[row.canonical_name]) aliasMap[row.canonical_name] = [];
      aliasMap[row.canonical_name].push(row.alias);
    }
  }

  return new Response(
    JSON.stringify({
      roles: uniqueRoles.map((name) => ({
        canonical_name: name,
        aliases: aliasMap[name] || [],
      })),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
