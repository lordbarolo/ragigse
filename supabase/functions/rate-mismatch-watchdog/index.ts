import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCronOrAdmin } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "henrik@compcare.se";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Latest run per version_id — alert if status='mismatch' OR 'error' AND age > 48h
    const { data: runs, error } = await supabase
      .from("rate_verification_runs")
      .select("id, run_at, status, version_id, mismatch_count, error_message, diff_json")
      .order("run_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const seen = new Set<string>();
    const latestPerVersion: any[] = [];
    for (const r of runs ?? []) {
      const key = r.version_id ?? "null";
      if (seen.has(key)) continue;
      seen.add(key);
      latestPerVersion.push(r);
    }

    // Also check constants
    const { data: cRuns } = await supabase
      .from("constants_verification_runs")
      .select("id, run_at, status, mismatch_count, diff_json")
      .order("run_at", { ascending: false }).limit(1);

    const constantsLatest = cRuns?.[0];

    const now = Date.now();
    const stale = latestPerVersion.filter((r) =>
      (r.status === "mismatch" || r.status === "error") &&
      (now - new Date(r.run_at).getTime()) > 48 * 3600 * 1000
    );
    const constantsAlert = constantsLatest && (constantsLatest.status === "mismatch" || constantsLatest.status === "error")
      && (now - new Date(constantsLatest.run_at).getTime()) > 48 * 3600 * 1000;

    if (stale.length === 0 && !constantsAlert) {
      return new Response(JSON.stringify({ ok: true, alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines: string[] = [];
    if (stale.length) {
      lines.push(`<h3>Pris-baseline avvikelser >48h</h3><ul>`);
      for (const r of stale) {
        lines.push(`<li>${r.run_at} — status: <b>${r.status}</b> — ${r.mismatch_count} diffar${r.error_message ? " — "+r.error_message : ""}</li>`);
      }
      lines.push("</ul>");
    }
    if (constantsAlert) {
      lines.push(`<h3>Konstant-kontroll avvikelse >48h</h3><p>${constantsLatest!.run_at} — status: <b>${constantsLatest!.status}</b> — ${constantsLatest!.mismatch_count} diffar.</p>`);
    }
    lines.push(`<p><a href="https://compcare.se/admin">Öppna admin</a></p>`);

    // Send via existing transactional function
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        to: ADMIN_EMAIL,
        subject: `[CompCare] Verifieringsavvikelser kvar >48h (${stale.length + (constantsAlert?1:0)})`,
        html: lines.join("\n"),
      },
    });

    return new Response(JSON.stringify({ ok: true, alerts: stale.length + (constantsAlert?1:0) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
