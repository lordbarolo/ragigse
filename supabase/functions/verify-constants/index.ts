import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCronOrAdmin } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MUST be kept in sync with src/lib/calc.ts. Drift here = drift in production formulas.
const LIVE_CONSTANTS: Record<string, unknown> = {
  "margin.specialist.share_min": 0.85,
  "margin.specialist.share_max": 0.90,
  "margin.standard.share_min": 0.80,
  "margin.standard.share_max": 0.85,
  "employer.factor": 1.38,
  "hours.per_month": 167,
  "ob.sjukskoterska.factor": 1.3142,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authError = await requireCronOrAdmin(req);
  if (authError) return authError;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Dynamic counts that drift over time
    const [{ count: aliasCount }, { count: locTotal }, { count: locZon }] = await Promise.all([
      supabase.from("role_aliases").select("*", { count: "exact", head: true }),
      supabase.from("locations").select("*", { count: "exact", head: true }),
      supabase.from("locations").select("*", { count: "exact", head: true }).not("zon", "is", null),
    ]);

    const live: Record<string, unknown> = {
      ...LIVE_CONSTANTS,
      "role_aliases.count": aliasCount ?? 0,
      "locations.total.count": locTotal ?? 0,
      "locations.with_zon.count": locZon ?? 0,
    };

    const { data: baseline, error } = await supabase
      .from("constants_verification_baseline")
      .select("key, expected_value");
    if (error) throw error;

    const baseMap = new Map((baseline ?? []).map((b: any) => [b.key, b.expected_value]));
    const diffs: Array<{ key: string; baseline: unknown; current: unknown; type: string }> = [];

    for (const [k, v] of baseMap) {
      const cur = live[k];
      if (cur === undefined) diffs.push({ key: k, baseline: v, current: null, type: "missing_in_live" });
      else if (JSON.stringify(cur) !== JSON.stringify(v)) diffs.push({ key: k, baseline: v, current: cur, type: "value_changed" });
    }
    for (const k of Object.keys(live)) {
      if (!baseMap.has(k)) diffs.push({ key: k, baseline: null, current: live[k], type: "extra_in_live" });
    }

    const status = diffs.length === 0 ? "ok" : "mismatch";
    const { data: run } = await supabase.from("constants_verification_runs").insert({
      status,
      total_keys: Object.keys(live).length,
      mismatch_count: diffs.length,
      diff_json: diffs.length > 0 ? { diffs } : null,
    }).select().single();

    return new Response(JSON.stringify({ ok: true, status, mismatch_count: diffs.length, total_keys: Object.keys(live).length, run_id: run?.id, diffs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("constants_verification_runs").insert({ status: "error", error_message: message });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
