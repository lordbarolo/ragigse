import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RateRow {
  yrkeskategori: string;
  zon: string;
  typ: string;
  timpris_kund: number;
}

const rowKey = (r: RateRow) => `${r.yrkeskategori}|${r.zon}|${r.typ}`;

async function checksum(rows: RateRow[]): Promise<string> {
  const sorted = [...rows].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
  const text = sorted.map((r) => `${rowKey(r)}=${Number(r.timpris_kund).toFixed(2)}`).join("\n");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyVersion(supabase: ReturnType<typeof createClient>, versionId: string, label: string) {
  const [{ data: live, error: liveErr }, { data: baseline, error: baseErr }] = await Promise.all([
    supabase.from("contract_version_rates")
      .select("yrkeskategori, zon, typ, timpris_kund").eq("version_id", versionId),
    supabase.from("rate_verification_baseline")
      .select("yrkeskategori, zon, typ, timpris_kund").eq("version_id", versionId),
  ]);
  if (liveErr) throw liveErr;
  if (baseErr) throw baseErr;

  const liveRows = (live ?? []) as RateRow[];
  const baseRows = (baseline ?? []) as RateRow[];

  // Empty baseline = not yet seeded; mark as error so admin notices.
  if (baseRows.length === 0) {
    const { data: run } = await supabase.from("rate_verification_runs").insert({
      version_id: versionId,
      status: "error",
      total_rows: liveRows.length,
      mismatch_count: 0,
      error_message: `No baseline seeded for ${label}`,
    }).select().single();
    return { version: label, status: "error", run_id: run?.id, mismatch_count: 0, total_rows: liveRows.length };
  }

  const [liveSum, baseSum] = await Promise.all([checksum(liveRows), checksum(baseRows)]);
  const liveMap = new Map(liveRows.map((r) => [rowKey(r), Number(r.timpris_kund)]));
  const baseMap = new Map(baseRows.map((r) => [rowKey(r), Number(r.timpris_kund)]));
  const diffs: Array<{ key: string; baseline: number | null; current: number | null; type: string }> = [];

  for (const [k, v] of baseMap) {
    const cur = liveMap.get(k);
    if (cur === undefined) diffs.push({ key: k, baseline: v, current: null, type: "missing_in_live" });
    else if (Math.abs(cur - v) > 0.001) diffs.push({ key: k, baseline: v, current: cur, type: "value_changed" });
  }
  for (const [k, v] of liveMap) {
    if (!baseMap.has(k)) diffs.push({ key: k, baseline: null, current: v, type: "extra_in_live" });
  }

  const status = diffs.length === 0 ? "ok" : "mismatch";
  const { data: run } = await supabase.from("rate_verification_runs").insert({
    version_id: versionId,
    status,
    total_rows: liveRows.length,
    mismatch_count: diffs.length,
    current_checksum: liveSum,
    baseline_checksum: baseSum,
    diff_json: diffs.length > 0 ? { diffs: diffs.slice(0, 500) } : null,
  }).select().single();

  return { version: label, status, run_id: run?.id, mismatch_count: diffs.length, total_rows: liveRows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: versions, error: vErr } = await supabase
      .from("contract_versions")
      .select("id, version_label, catalog_name")
      .eq("is_active", true);
    if (vErr) throw vErr;
    if (!versions || versions.length === 0) throw new Error("No active contract versions");

    const results = [];
    for (const v of versions) {
      try {
        results.push(await verifyVersion(supabase, v.id as string, `${v.catalog_name} ${v.version_label}`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("rate_verification_runs").insert({
          version_id: v.id, status: "error", error_message: msg,
        });
        results.push({ version: `${v.catalog_name} ${v.version_label}`, status: "error", error: msg });
      }
    }

    const total_mismatches = results.reduce((s, r: any) => s + (r.mismatch_count ?? 0), 0);
    return new Response(JSON.stringify({ ok: true, results, mismatch_count: total_mismatches, total_rows: results.reduce((s,r:any)=>s+(r.total_rows??0),0) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("rate_verification_runs").insert({ status: "error", error_message: message });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
