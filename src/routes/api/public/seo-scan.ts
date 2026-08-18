/**
 * Automatisk SEO-uppföljning.
 *
 * Schemalagt jobb (pg_cron, veckovis) som hämtar varje URL i sitemapen och
 * kontrollerar on-page-hygien. Resultatet loggas i public.seo_scan_runs /
 * public.seo_scan_findings så att det alltid finns en spårbar "sist verifierad".
 *
 * Skydd: ligger under /api/public/* (ingen sajt-auth) och verifierar därför i
 * handlern att headern `x-seo-scan-key` matchar projektets service-role-nyckel
 * (SUPABASE_SERVICE_ROLE_KEY). Endast schemaläggaren har den nyckeln, så inga
 * extra hemligheter behöver hanteras. Svaret innehåller ingen PII.
 */

import { createFileRoute } from "@tanstack/react-router";
import { checkPage, type Finding } from "@/lib/seo/scanChecks";
import { getContentFreshness, CONTENT_FRESHNESS } from "@/data/contentFreshness";

const MAX_PAGES = 60;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function pathsFromSitemap(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    try {
      out.push(new URL(m[1]!.trim()).pathname || "/");
    } catch {
      /* hoppa över trasig loc */
    }
  }
  return [...new Set(out)].slice(0, MAX_PAGES);
}

/** Registernyckel för en sökväg, t.ex. /rapport/sjukskoterska → rapport/sjukskoterska. */
function freshnessKey(path: string): string | null {
  const key = path.replace(/^\//, "").replace(/\/$/, "");
  if (key.startsWith("rapport/") || key.startsWith("guide/")) return key;
  return null;
}

export const Route = createFileRoute("/api/public/seo-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const provided = request.headers.get("x-seo-scan-key") ?? "";
        if (!secret || !provided || !timingSafeEqual(provided, secret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const origin = new URL(request.url).origin;
        const startedAt = Date.now();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: run, error: runError } = await supabaseAdmin
          .from("seo_scan_runs")
          .insert({ status: "running" })
          .select("id")
          .single();

        if (runError || !run) {
          console.error("seo-scan: kunde inte skapa körning", runError);
          return new Response(
            JSON.stringify({ ok: false, error: runError?.message ?? "insert failed" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        const findings: Finding[] = [];
        let pagesChecked = 0;

        try {
          const sitemapRes = await fetch(`${origin}/sitemap.xml`);
          if (!sitemapRes.ok) throw new Error(`sitemap.xml svarade ${sitemapRes.status}`);
          const paths = pathsFromSitemap(await sitemapRes.text());
          if (paths.length === 0) throw new Error("sitemap.xml innehöll inga URL:er");

          for (const path of paths) {
            let html = "";
            let status = 0;
            try {
              const res = await fetch(`${origin}${path}`, {
                headers: { "user-agent": "vardbemanning-seo-scan/1.0" },
              });
              status = res.status;
              html = res.ok ? await res.text() : "";
            } catch (e) {
              findings.push({
                path,
                checkId: "fetch_failed",
                severity: "error",
                message: e instanceof Error ? e.message : "okänt nätverksfel",
              });
              continue;
            }

            const key = freshnessKey(path);
            const expectedDateModified =
              key && (CONTENT_FRESHNESS[key] || key.startsWith("rapport/"))
                ? getContentFreshness(key).updatedAt
                : undefined;

            findings.push(...checkPage({ path, html, status, expectedDateModified }));
            pagesChecked += 1;
          }

          const errorCount = findings.filter((f) => f.severity === "error").length;
          const warningCount = findings.filter((f) => f.severity === "warning").length;

          if (findings.length > 0) {
            const { error: findingsError } = await supabaseAdmin
              .from("seo_scan_findings")
              .insert(
                findings.map((f) => ({
                  run_id: run.id,
                  path: f.path,
                  check_id: f.checkId,
                  severity: f.severity,
                  message: f.message,
                })),
              );
            if (findingsError) console.error("seo-scan: kunde inte spara fynd", findingsError);
          }

          const durationMs = Date.now() - startedAt;
          await supabaseAdmin
            .from("seo_scan_runs")
            .update({
              finished_at: new Date().toISOString(),
              pages_checked: pagesChecked,
              error_count: errorCount,
              warning_count: warningCount,
              duration_ms: durationMs,
              status: "completed",
            })
            .eq("id", run.id);

          return new Response(
            JSON.stringify({
              ok: true,
              run_id: run.id,
              pages_checked: pagesChecked,
              error_count: errorCount,
              warning_count: warningCount,
              duration_ms: durationMs,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : "okänt fel";
          console.error("seo-scan: körningen misslyckades", message);
          await supabaseAdmin
            .from("seo_scan_runs")
            .update({
              finished_at: new Date().toISOString(),
              pages_checked: pagesChecked,
              status: "failed",
              error_message: message,
              duration_ms: Date.now() - startedAt,
            })
            .eq("id", run.id);

          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
