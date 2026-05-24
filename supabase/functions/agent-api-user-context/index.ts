// GET /agent-api-user-context
// Requires user-scoped token (Bearer cut_...). Returns the user's professional profile only.
// No email, name, documents, or PII.

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
  const authResult = await authenticateAgentRequest(req, null);
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  if (ctx.type !== "user_token" || !ctx.user_id) {
    const r = jsonResponse({ error: "user_token_required" }, 403);
    await logAgentCall(ctx, req, "agent-api-user-context", 403, start, {});
    return r;
  }

  try {
    const sb = adminClient();
    const { data: profile } = await sb
      .from("consultant_profiles")
      .select("employment_type, experience_years, sector, care_setting, current_hourly_rate, current_monthly_salary, salary_type")
      .eq("user_id", ctx.user_id)
      .maybeSingle();

    // Bucket current rate into ranges (don't expose exact value)
    let rateBucket: string | null = null;
    if (profile?.current_hourly_rate) {
      const r = profile.current_hourly_rate;
      if (r < 600) rateBucket = "<600";
      else if (r < 800) rateBucket = "600-799";
      else if (r < 1000) rateBucket = "800-999";
      else if (r < 1200) rateBucket = "1000-1199";
      else if (r < 1500) rateBucket = "1200-1499";
      else rateBucket = "1500+";
    }

    const payload = {
      user_context: {
        employment_type: profile?.employment_type ?? null,
        experience_years: profile?.experience_years ?? null,
        sector: profile?.sector ?? null,
        care_setting: profile?.care_setting ?? null,
        current_hourly_rate_range_sek: rateBucket,
        salary_type: profile?.salary_type ?? null,
      },
      disclaimer:
        "Exact rate omitted; bucketed range only. No name/email/documents. Token can be revoked by user at any time.",
    };
    const body = JSON.stringify(payload);
    await logAgentCall(ctx, req, "agent-api-user-context", 200, start, {}, body.length);
    return new Response(body, {
      status: 200,
      headers: { ...agentCors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    await logAgentCall(ctx, req, "agent-api-user-context", 500, start, {}, undefined, msg);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
