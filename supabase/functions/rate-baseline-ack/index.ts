// Admin-only endpoint to acknowledge a baseline mismatch and re-snapshot the baseline row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AckBody {
  version_id: string;
  items: Array<{ yrkeskategori: string; zon: string; typ: string; new_value: number }>;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: isAdmin } = await supabase.rpc("ref_has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json() as AckBody;
    if (!body?.version_id || !Array.isArray(body.items) || body.items.length === 0 || !body.reason?.trim()) {
      return new Response(JSON.stringify({ error: "invalid body" }), { status: 400, headers: corsHeaders });
    }
    if (body.reason.trim().length < 10) {
      return new Response(JSON.stringify({ error: "reason must be >=10 chars" }), { status: 400, headers: corsHeaders });
    }

    let updated = 0;
    for (const it of body.items) {
      // Fetch existing baseline row for the old_value
      const { data: existing } = await supabase
        .from("rate_verification_baseline")
        .select("timpris_kund")
        .eq("version_id", body.version_id)
        .eq("yrkeskategori", it.yrkeskategori)
        .eq("zon", it.zon)
        .eq("typ", it.typ)
        .maybeSingle();

      const oldValue = existing?.timpris_kund ?? null;

      // Upsert baseline
      if (existing) {
        await supabase.from("rate_verification_baseline")
          .update({ timpris_kund: it.new_value, source_note: `Re-baselined ${new Date().toISOString().slice(0,10)} by admin` })
          .eq("version_id", body.version_id)
          .eq("yrkeskategori", it.yrkeskategori)
          .eq("zon", it.zon)
          .eq("typ", it.typ);
      } else {
        await supabase.from("rate_verification_baseline").insert({
          version_id: body.version_id,
          yrkeskategori: it.yrkeskategori, zon: it.zon, typ: it.typ,
          timpris_kund: it.new_value,
          source_note: `Re-baselined ${new Date().toISOString().slice(0,10)} by admin`,
        });
      }

      await supabase.from("rate_baseline_acknowledgments").insert({
        version_id: body.version_id,
        yrkeskategori: it.yrkeskategori, zon: it.zon, typ: it.typ,
        old_value: oldValue, new_value: it.new_value,
        reason: body.reason, acknowledged_by: user.id,
      });
      updated++;
    }

    // Trigger a fresh verify-rates run
    await supabase.functions.invoke("verify-rates");

    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: corsHeaders });
  }
});
