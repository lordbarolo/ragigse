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

  // Return distinct canonical roles from normalized roles table
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, code, name, parent_role_id, active")
    .eq("active", true)
    .order("name");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Also return aliases grouped by role
  const { data: aliasData } = await supabase
    .from("role_aliases")
    .select("alias, role_id")
    .order("alias");

  const roleIds = new Set((roles || []).map((r) => r.id));
  const aliasMap: Record<string, string[]> = {};
  for (const row of aliasData || []) {
    if (!aliasMap[row.role_id]) aliasMap[row.role_id] = [];
    // Don't include alias if it equals the role name
    const role = (roles || []).find((r) => r.id === row.role_id);
    if (role && row.alias !== role.name) {
      aliasMap[row.role_id].push(row.alias);
    }
  }

  return new Response(
    JSON.stringify({
      roles: (roles || []).map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        aliases: aliasMap[r.id] || [],
      })),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
