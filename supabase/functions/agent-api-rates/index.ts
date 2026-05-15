// GET /agent-api-rates?role=Sjuksköterska&region=VGR&year=2026
// Returns SKR frame-agreement base prices for the requested role+region.
// Scope: rates:read

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  agentCors,
  authenticateAgentRequest,
  jsonResponse,
  logAgentCall,
  adminClient,
} from "../_shared/agent-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCors });
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  const start = Date.now();
  const url = new URL(req.url);
  const role = url.searchParams.get("role")?.trim();
  const region = url.searchParams.get("region")?.trim();
  const year = url.searchParams.get("year")?.trim() || "2026";
  const params = { role, region, year };

  const authResult = await authenticateAgentRequest(req, "rates:read");
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  if (!role) {
    const r = jsonResponse({ error: "missing_param", param: "role" }, 400);
    await logAgentCall(ctx, req, "agent-api-rates", 400, start, params, undefined, "missing role");
    return r;
  }

  try {
    const sb = adminClient();
    // Resolve active version for the requested year
    const { data: versions } = await sb
      .from("contract_versions")
      .select("id, catalog_name, version_label, effective_from")
      .eq("is_active", true)
      .order("effective_from", { ascending: false });

    const matchYear = (versions || []).find((v: any) =>
      String(v.effective_from || "").startsWith(year),
    );
    const version = matchYear ?? (versions || [])[0];

    if (!version) {
      const r = jsonResponse({ error: "no_active_version" }, 404);
      await logAgentCall(ctx, req, "agent-api-rates", 404, start, params);
      return r;
    }

    let query = sb
      .from("contract_version_rates")
      .select("yrkeskategori, zon, typ, timpris_kund, detaljer")
      .eq("version_id", version.id)
      .ilike("yrkeskategori", `%${role}%`);

    if (region) query = query.ilike("zon", `%${region}%`);

    const { data: rates, error } = await query.limit(50);
    if (error) {
      const r = jsonResponse({ error: "query_failed" }, 500);
      await logAgentCall(ctx, req, "agent-api-rates", 500, start, params, undefined, error.message);
      return r;
    }

    const payload = {
      source: `SKR ${version.catalog_name} ${version.version_label}`,
      effective_from: version.effective_from,
      role_query: role,
      region_query: region,
      results: (rates || []).map((r: any) => ({
        role: r.yrkeskategori,
        region: r.zon,
        type: r.typ,
        base_hourly_rate_sek: r.timpris_kund,
        notes: r.detaljer || null,
      })),
      disclaimer:
        "Base prices only. Excludes OB-tillägg, jour, margins. For consultant compensation, apply industry margin (8–18% depending on role).",
    };
    const body = JSON.stringify(payload);
    await logAgentCall(ctx, req, "agent-api-rates", 200, start, params, body.length);
    return new Response(body, {
      status: 200,
      headers: { ...agentCors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await logAgentCall(ctx, req, "agent-api-rates", 500, start, params, undefined, msg);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
