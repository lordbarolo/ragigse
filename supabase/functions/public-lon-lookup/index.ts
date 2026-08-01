// public-lon-lookup — publik entrypoint för /lon/[specialty]/[city] (programmatic SEO).
// Anropar RPC:n public.lookup_rate med service_role. Returnerar ENDAST de sex
// publicerbara fälten (rollnamn, ortnamn, kundpris, företagare, löntagare, källa).
// Ingen fri SELECT mot råtabellerna, ingen PII, rate-limitad per IP.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROUP_LABEL = /\bgrupp\s*[a-zA-Z0-9]+\b/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });

/** Måste ge exakt samma resultat som public.cc_slugify i databasen. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[åäàáâ]/g, "a")
    .replace(/[öóô]/g, "o")
    .replace(/[éèêë]/g, "e")
    .replace(/[üúù]/g, "u")
    .replace(/[íì]/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(supabase, "public-lon-lookup", clientIp, 120, 60);
  if (!rl.allowed) return json({ error: "För många förfrågningar. Försök igen om en stund." }, 429);

  let body: { action?: string; specialty?: string; city?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig förfrågan" }, 400);
  }

  try {
    // ── Giltiga roller + orter (för fallback-sökrutan) ──
    if (body.action === "options") {
      const [rolesRes, locRes] = await Promise.all([
        supabase
          .from("contract_version_rates")
          .select("yrkeskategori, contract_versions!inner(is_active)")
          .eq("contract_versions.is_active", true),
        supabase.from("locations").select("kommun, region, zon"),
      ]);
      if (rolesRes.error) throw rolesRes.error;
      if (locRes.error) throw locRes.error;

      const roles = Array.from(
        new Set(
          (rolesRes.data ?? [])
            .map((r) => r.yrkeskategori as string)
            .filter((r) => r && !GROUP_LABEL.test(r) && !/^OB-tillägg/i.test(r)),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "sv"))
        .map((name) => ({ name, slug: slugify(name) }));

      const cities = (locRes.data ?? [])
        .map((l) => ({ name: l.kommun as string, region: l.region as string, slug: slugify(l.kommun as string) }))
        .sort((a, b) => a.name.localeCompare(b.name, "sv"));

      return json({ roles, cities });
    }

    // ── Uppslag för en kombination roll + ort ──
    const specialty = (body.specialty ?? "").toString().slice(0, 120);
    const city = (body.city ?? "").toString().slice(0, 120);
    if (!specialty || !city) return json({ error: "specialty och city krävs" }, 400);

    const { data, error } = await supabase.rpc("lookup_rate", {
      specialty_slug: slugify(specialty),
      location_slug: slugify(city),
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || GROUP_LABEL.test(String(row.specialty_name ?? ""))) {
      return json({ found: false }, 404);
    }

    return json({
      found: true,
      specialty_name: row.specialty_name,
      location_name: row.location_name,
      client_rate: row.client_rate,
      contractor_rate: row.contractor_rate,
      employee_rate: row.employee_rate,
      source: row.source,
    });
  } catch (e) {
    console.error("[public-lon-lookup]", e);
    return json({ error: "Kunde inte hämta uppgifterna just nu." }, 500);
  }
});
