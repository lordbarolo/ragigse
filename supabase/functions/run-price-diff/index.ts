import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { old_version_id, new_version_id } = await req.json();

    if (!new_version_id) {
      return new Response(
        JSON.stringify({ error: "new_version_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch new version rates
    const { data: newRates, error: newErr } = await supabase
      .from("contract_version_rates")
      .select("yrkeskategori, zon, typ, timpris_kund")
      .eq("version_id", new_version_id);

    if (newErr) throw newErr;

    // Fetch old version rates (if provided)
    let oldRatesMap = new Map<string, number>();
    if (old_version_id) {
      const { data: oldRates, error: oldErr } = await supabase
        .from("contract_version_rates")
        .select("yrkeskategori, zon, timpris_kund")
        .eq("version_id", old_version_id);

      if (oldErr) throw oldErr;

      for (const r of oldRates || []) {
        oldRatesMap.set(`${r.yrkeskategori}|${r.zon}`, r.timpris_kund);
      }
    }

    // Calculate diffs
    const changes = (newRates || []).map((nr) => {
      const key = `${nr.yrkeskategori}|${nr.zon}`;
      const oldPrice = oldRatesMap.get(key);
      const diffAbs = oldPrice != null ? nr.timpris_kund - oldPrice : 0;
      const diffPct =
        oldPrice != null && oldPrice > 0
          ? Math.round(((nr.timpris_kund - oldPrice) / oldPrice) * 10000) / 100
          : 0;

      let changeType = "unchanged";
      if (oldPrice == null) changeType = "new";
      else if (diffAbs > 0) changeType = "increase";
      else if (diffAbs < 0) changeType = "decrease";

      // Remove from map to detect removed rates later
      oldRatesMap.delete(key);

      return {
        old_version_id: old_version_id || null,
        new_version_id,
        yrkeskategori: nr.yrkeskategori,
        zon: nr.zon,
        old_timpris: oldPrice ?? null,
        new_timpris: nr.timpris_kund,
        diff_abs: diffAbs,
        diff_pct: diffPct,
        change_type: changeType,
      };
    });

    // Add removed rates (existed in old but not in new)
    for (const [key, oldPrice] of oldRatesMap.entries()) {
      const [yrkeskategori, zon] = key.split("|");
      changes.push({
        old_version_id: old_version_id || null,
        new_version_id,
        yrkeskategori,
        zon,
        old_timpris: oldPrice,
        new_timpris: 0,
        diff_abs: -oldPrice,
        diff_pct: -100,
        change_type: "removed",
      });
    }

    // Clear previous diffs for this version pair and insert new ones
    if (old_version_id) {
      await supabase
        .from("price_changes")
        .delete()
        .eq("old_version_id", old_version_id)
        .eq("new_version_id", new_version_id);
    }

    const { error: insertErr } = await supabase
      .from("price_changes")
      .insert(changes);

    if (insertErr) throw insertErr;

    const summary = {
      total: changes.length,
      increases: changes.filter((c) => c.change_type === "increase").length,
      decreases: changes.filter((c) => c.change_type === "decrease").length,
      new_entries: changes.filter((c) => c.change_type === "new").length,
      removed: changes.filter((c) => c.change_type === "removed").length,
      unchanged: changes.filter((c) => c.change_type === "unchanged").length,
    };

    return new Response(
      JSON.stringify({ success: true, summary, changes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
