import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin auth check
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: feedback, error } = await supabase
      .from("report_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = feedback || [];
    const total = rows.length;

    const byCounts: Record<string, number> = {};
    for (const r of rows) {
      byCounts[r.rating] = (byCounts[r.rating] || 0) + 1;
    }

    const byRole: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const role = r.role || "Okänd";
      if (!byRole[role]) byRole[role] = {};
      byRole[role][r.rating] = (byRole[role][r.rating] || 0) + 1;
    }

    const recent = rows.slice(0, 20).map((r) => ({
      rating: r.rating,
      comment: r.comment,
      role: r.role,
      zone: r.zone,
      created_at: r.created_at,
    }));

    return new Response(
      JSON.stringify({ total, by_rating: byCounts, by_role: byRole, recent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
