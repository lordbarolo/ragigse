// Monthly automated security audit.
// Runs SQL-based checks that mirror what supabase--linter + security--run_security_scan catch,
// stores results in public.security_audit_runs, and emails a summary to the admin.
// Triggered by pg_cron on the 1st of each month at 04:00 (Europe/Stockholm).
// Auth: requires service_role JWT (set up via Vault secret in the cron job).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "henrik@compcare.se";

type Finding = {
  category: string;
  severity: "info" | "warn" | "error";
  title: string;
  detail: string;
};

function isServiceRoleAuth(req: Request): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  // service_role JWT is the only Bearer we accept (cron uses Vault)
  return token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isServiceRoleAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const findings: Finding[] = [];
  const startedAt = new Date();

  try {
    // ---------- DEL 1: RLS ----------
    const { data: rlsStats } = await supabase.rpc("security_audit_rls_stats" as never);
    // Fallback raw queries via select if RPC missing
    const tables = await supabase
      .from("pg_tables" as never)
      .select("*")
      .eq("schemaname", "public");

    // Use direct SQL via Postgres-compatible select on system catalogs through a view we create in migration
    const checks = await runSqlChecks(supabase);

    findings.push(...checks);
  } catch (e) {
    findings.push({
      category: "infra",
      severity: "error",
      title: "Audit run crashed",
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  const summary = {
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    total: findings.length,
    error_count: findings.filter((f) => f.severity === "error").length,
    warn_count: findings.filter((f) => f.severity === "warn").length,
    info_count: findings.filter((f) => f.severity === "info").length,
  };

  // Persist
  const { data: run, error: insertErr } = await supabase
    .from("security_audit_runs")
    .insert({
      summary,
      findings,
      status: summary.error_count > 0 ? "error" : summary.warn_count > 0 ? "warn" : "ok",
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Failed to persist audit run:", insertErr);
  }

  // Compare with previous run for diff
  const { data: prev } = await supabase
    .from("security_audit_runs")
    .select("id, created_at, summary, findings")
    .order("created_at", { ascending: false })
    .range(1, 1)
    .maybeSingle();

  const diff = computeDiff(prev?.findings as Finding[] | undefined, findings);

  // Email summary
  const html = renderHtml(summary, findings, diff, prev?.created_at as string | undefined);
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        to: ADMIN_EMAIL,
        subject: `[vårdbemanning.ai] Månatlig säkerhetsaudit — ${summary.error_count} ERR / ${summary.warn_count} WARN`,
        html,
      },
    });
  } catch (e) {
    console.error("Failed to send audit email:", e);
  }

  return new Response(
    JSON.stringify({ ok: true, run_id: run?.id, summary, diff }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

// ---------- SQL CHECKS ----------
// All checks are read-only and use a single security_definer view installed via migration.

async function runSqlChecks(supabase: ReturnType<typeof createClient>): Promise<Finding[]> {
  const out: Finding[] = [];

  // 1. Tables without RLS
  const { data: rlsOff } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "rls_disabled_tables")
    .maybeSingle();
  if (rlsOff?.payload && Array.isArray(rlsOff.payload) && rlsOff.payload.length > 0) {
    for (const t of rlsOff.payload as Array<{ tablename: string }>) {
      out.push({
        category: "rls",
        severity: "error",
        title: "Table without RLS enabled",
        detail: `public.${t.tablename}`,
      });
    }
  }

  // 2. Tables with RLS but no policies
  const { data: noPol } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "tables_without_policies")
    .maybeSingle();
  if (noPol?.payload && Array.isArray(noPol.payload)) {
    for (const t of noPol.payload as Array<{ tablename: string }>) {
      out.push({
        category: "rls",
        severity: "warn",
        title: "Table with RLS but no policies (locked down)",
        detail: `public.${t.tablename}`,
      });
    }
  }

  // 3. SECURITY DEFINER funcs without search_path
  const { data: noPath } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "secdef_without_search_path")
    .maybeSingle();
  if (noPath?.payload && Array.isArray(noPath.payload)) {
    for (const f of noPath.payload as Array<{ proname: string }>) {
      out.push({
        category: "function",
        severity: "error",
        title: "SECURITY DEFINER without search_path",
        detail: `public.${f.proname}`,
      });
    }
  }

  // 4. Public storage buckets
  const { data: buckets } = await supabase.from("buckets" as never).select("id, public").eq("public", true);
  if (buckets && buckets.length > 0) {
    for (const b of buckets as Array<{ id: string }>) {
      out.push({
        category: "storage",
        severity: "warn",
        title: "Public storage bucket",
        detail: b.id,
      });
    }
  }

  // 5. Permissive RLS (USING true on UPDATE/DELETE/INSERT)
  const { data: permissive } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "permissive_rls_policies")
    .maybeSingle();
  if (permissive?.payload && Array.isArray(permissive.payload)) {
    for (const p of permissive.payload as Array<{ tablename: string; policyname: string; cmd: string; roles: string }>) {
      // Skip service_role policies (intentional)
      if (p.roles?.includes("service_role")) continue;
      out.push({
        category: "rls",
        severity: "warn",
        title: `Permissive RLS policy (${p.cmd} USING/CHECK true)`,
        detail: `${p.tablename}.${p.policyname} — roles: ${p.roles}`,
      });
    }
  }

  // 6. OR-on-nullable in policies
  const { data: orNull } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "or_on_nullable_policies")
    .maybeSingle();
  if (orNull?.payload && Array.isArray(orNull.payload)) {
    for (const p of orNull.payload as Array<{ tablename: string; policyname: string }>) {
      out.push({
        category: "rls",
        severity: "error",
        title: "OR-on-nullable RLS policy (banned pattern)",
        detail: `${p.tablename}.${p.policyname}`,
      });
    }
  }

  // 7. Views in public without security_invoker
  const { data: views } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "definer_views")
    .maybeSingle();
  if (views?.payload && Array.isArray(views.payload)) {
    const allowlist = new Set(["calloff_imports_public"]);
    for (const v of views.payload as Array<{ viewname: string }>) {
      if (allowlist.has(v.viewname)) continue;
      out.push({
        category: "view",
        severity: "warn",
        title: "View without security_invoker=on",
        detail: `public.${v.viewname}`,
      });
    }
  }

  // 8. Realtime publication tables
  const { data: rt } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "realtime_tables")
    .maybeSingle();
  if (rt?.payload && Array.isArray(rt.payload)) {
    for (const t of rt.payload as Array<{ tablename: string }>) {
      out.push({
        category: "realtime",
        severity: "info",
        title: "Table published to realtime",
        detail: `public.${t.tablename}`,
      });
    }
  }

  // 9. Extensions in public
  const { data: ext } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "extensions_in_public")
    .maybeSingle();
  if (ext?.payload && Array.isArray(ext.payload)) {
    for (const e of ext.payload as Array<{ extname: string }>) {
      out.push({
        category: "extension",
        severity: "warn",
        title: "Extension installed in public schema",
        detail: e.extname,
      });
    }
  }

  // 10. Cron jobs using anon JWT
  const { data: crons } = await supabase
    .from("security_audit_view")
    .select("payload")
    .eq("check_name", "cron_anon_jwt")
    .maybeSingle();
  if (crons?.payload && Array.isArray(crons.payload)) {
    for (const c of crons.payload as Array<{ jobname: string }>) {
      out.push({
        category: "cron",
        severity: "warn",
        title: "pg_cron job uses anon JWT (should use Vault secret)",
        detail: c.jobname,
      });
    }
  }

  return out;
}

// ---------- DIFF ----------

function fingerprint(f: Finding): string {
  return `${f.category}|${f.severity}|${f.title}|${f.detail}`;
}

function computeDiff(prev: Finding[] | undefined, curr: Finding[]) {
  if (!prev) return { new: curr.length, resolved: 0, kept: 0, first_run: true };
  const prevSet = new Set(prev.map(fingerprint));
  const currSet = new Set(curr.map(fingerprint));
  const newF = curr.filter((f) => !prevSet.has(fingerprint(f)));
  const resolvedF = prev.filter((f) => !currSet.has(fingerprint(f)));
  const keptF = curr.filter((f) => prevSet.has(fingerprint(f)));
  return {
    new: newF.length,
    resolved: resolvedF.length,
    kept: keptF.length,
    new_items: newF.slice(0, 20),
    resolved_items: resolvedF.slice(0, 20),
  };
}

// ---------- EMAIL ----------

function renderHtml(
  summary: Record<string, unknown>,
  findings: Finding[],
  diff: Record<string, unknown>,
  prevDate: string | undefined,
): string {
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");
  const renderList = (arr: Finding[]) =>
    arr.length === 0
      ? "<p><em>Inga.</em></p>"
      : `<ul>${arr.map((f) => `<li><b>[${f.category}]</b> ${escape(f.title)} — <code>${escape(f.detail)}</code></li>`).join("")}</ul>`;
  return `
    <h2>vårdbemanning.ai — Månatlig säkerhetsaudit</h2>
    <p>Körd: ${summary.finished_at}</p>
    <p>Totalt: <b>${summary.total}</b> findings (${summary.error_count} ERR, ${summary.warn_count} WARN, ${summary.info_count} INFO)</p>
    <h3>Diff mot ${prevDate ?? "föregående körning"}</h3>
    <p>🆕 Nya: <b>${diff.new}</b> · ✅ Lösta: <b>${diff.resolved}</b> · ⏳ Kvarstår: <b>${diff.kept ?? "?"}</b></p>
    <h3>ERROR (${errors.length})</h3>
    ${renderList(errors)}
    <h3>WARN (${warns.length})</h3>
    ${renderList(warns.slice(0, 30))}
    ${warns.length > 30 ? `<p><em>+ ${warns.length - 30} fler — se security_audit_runs i admin.</em></p>` : ""}
    <hr>
    <p style="color:#666;font-size:12px">
      Detta är automatiserade SQL-baserade checks. För fullständig revision (Lovable-scan + linter + manuell genomgång),
      kör <code>security--run_security_scan</code> + <code>supabase--linter</code> via Lovable-chatten och producera
      en <code>security-reports/YYYY-MM-DD-security-audit.md</code> enligt <code>AUDIT_TEMPLATE.md</code>.
    </p>
  `;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}
