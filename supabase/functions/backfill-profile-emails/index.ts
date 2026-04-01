import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get all profiles without email
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id")
    .is("email", null);

  let updated = 0;
  for (const p of profiles || []) {
    const { data: { user } } = await supabase.auth.admin.getUserById(p.user_id);
    if (user?.email) {
      await supabase.from("profiles").update({ email: user.email }).eq("id", p.id);
      updated++;
    }
  }

  return new Response(JSON.stringify({ updated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
