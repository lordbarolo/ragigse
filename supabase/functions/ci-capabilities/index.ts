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

  const { data, error } = await supabase
    .from("capability_definitions")
    .select("capability_key, version, name, description, human_label, agent_label, input_schema_json, output_schema_json")
    .eq("is_active", true)
    .order("capability_key");

  if (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const capabilities = (data || []).map((c) => ({
    capability_key: c.capability_key,
    version: c.version,
    name: c.name,
    description: c.description,
    human_label: c.human_label,
    agent_label: c.agent_label,
    input_schema: c.input_schema_json,
    output_schema: c.output_schema_json,
  }));

  const error_codes = [
    { code: "ENTITY_NOT_RESOLVED", description: "Kunde inte matcha en eller flera entiteter (roll eller geografi).", http_status: 404 },
    { code: "INSUFFICIENT_SAMPLE", description: "För få datapunkter för att visa benchmark (n<10).", http_status: 422 },
    { code: "QUERY_TOO_BROAD", description: "Frågan är för bred — ange roll och/eller geografi.", http_status: 400 },
    { code: "ENUMERATION_RISK", description: "För många sekventiella uppslag — anti-enumerering aktiverad.", http_status: 429 },
    { code: "RATE_LIMITED", description: "Rate limit nådd.", http_status: 429 },
    { code: "CAPABILITY_NOT_ALLOWED", description: "Capability ej tillåten för denna klientprofil.", http_status: 403 },
    { code: "NO_DATA_FOUND", description: "Inga data hittades för angiven kombination.", http_status: 404 },
    { code: "INVALID_INPUT", description: "Ogiltig indata.", http_status: 400 },
  ];

  return new Response(JSON.stringify({ capabilities, error_codes }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
