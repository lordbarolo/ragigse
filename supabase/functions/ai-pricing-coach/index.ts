// ai-pricing-coach
// "Smart auto-pricing": Given user's role/region/employment + current rate, returns
// a neutral analysis (lowest acceptable, market median, top of band) with reasoning.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { logAiUsage, extractTokensFromResponse, checkAiRateLimit, aiRateLimitResponse } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  role: z.string().min(1).max(120),
  region: z.string().min(1).max(120),
  employmentType: z.enum(["foretagare", "anstalld", "consultant", "permanent"]).optional().nullable(),
  currentRate: z.number().nonnegative().optional().nullable(),
});

async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

function mapEmployment(t: string | null | undefined): "foretagare" | "anstalld" {
  return (t === "foretagare" || t === "consultant") ? "foretagare" : "anstalld";
}

function isSpecialistDoctor(role: string): boolean {
  const n = role.trim().toLowerCase();
  return n.startsWith("specialistläkare") || n.startsWith("specialistlakare");
}

function calcRange(customerPrice: number, empType: "foretagare" | "anstalld", role: string) {
  // Role-based margin (matches _shared/calc.ts):
  //  - Specialistläkare: bemanning behåller 10–15% → konsult 85–90%
  //  - Övriga roller: bemanning behåller 15–20% → konsult 80–85%
  // Anställda divideras med employer_factor 1.42 för att få timlön.
  const isSpec = isSpecialistDoctor(role);
  const shareMin = isSpec ? 0.85 : 0.80;
  const shareMax = isSpec ? 0.90 : 0.85;
  const factor = empType === "anstalld" ? 1.42 : 1;
  return {
    hourly_min: Math.round((customerPrice * shareMin) / factor),
    hourly_max: Math.round((customerPrice * shareMax) / factor),
  };
}

const SYSTEM = `Du är CompCares neutrala marknadsanalytiker. Aldrig "topp X%" eller social benchmarking.
Regler:
- Svara på svenska, max 4 meningar.
- Använd ENDAST de siffror du får (SKR-ramavtal + branschmarginal). Hitta inte på.
- Föreslå aldrig en ersättning som är LÄGRE än användarens nuvarande timpris.
- Använd försiktig ton: "marknadens spann ligger på...", "ramavtalet medger...".
- Inga emojis, ingen markdown, inga listor.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const startedAt = Date.now();
  const userId = await getAuthUserId(req);

  const rl = await checkAiRateLimit(userId);
  if (!rl.allowed) {
    await logAiUsage({ feature: "ai-pricing-coach", model: "google/gemini-3-flash-preview", userId, status: "rate_limited" });
    return aiRateLimitResponse(rl, corsHeaders);
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    body = parsed.data;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 1. Look up SKR rates for this role across zones, then find the zone matching region
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const { data: rates } = await sb
    .from("rates")
    .select("zon, timpris_kund")
    .eq("yrkeskategori", body.role)
    .order("zon");

  if (!rates || rates.length === 0) {
    return new Response(JSON.stringify({
      error: "no_market_data",
      message: "Vi har ännu inga ramavtalspriser för denna roll. Försök igen senare."
    }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Look up zone for the region
  const { data: regionRow } = await sb
    .from("regions")
    .select("zon")
    .eq("kommun", body.region)
    .maybeSingle();

  const zone = regionRow?.zon || rates[0].zon;
  const zoneRate = rates.find((r) => r.zon === zone) ?? rates[0];

  const empType = mapEmployment(body.employmentType);
  const range = calcRange(zoneRate.timpris_kund, empType, body.role);

  // Enforce safety threshold
  let safeMin = range.hourly_min;
  if (body.currentRate && body.currentRate > safeMin) {
    safeMin = body.currentRate;
  }

  const facts = {
    role: body.role,
    region: body.region,
    zone,
    employmentType: empType,
    customerPriceHour: zoneRate.timpris_kund,
    expectedRangeHour: { min: range.hourly_min, max: range.hourly_max },
    suggestedFloor: safeMin,
    currentRate: body.currentRate ?? null,
  };

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userPrompt = `Marknadsdata för konsulten:
${JSON.stringify(facts, null, 2)}

Skriv en neutral marknadskommentar (max 4 meningar) som beskriver:
1) Var ramavtalet ligger.
2) Förväntat ersättningsspann (${range.hourly_min}–${range.hourly_max} kr/h).
3) En försiktig observation om förhandlingsutrymme givet det nuvarande timpriset (om angivet).
Ange inga procent, inga peer-jämförelser, ingen "push"-ton.`;

  const model = "google/gemini-3-flash-preview";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (resp.status === 429) {
      await logAiUsage({ feature: "ai-pricing-coach", model, userId, status: "rate_limited" });
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      await logAiUsage({ feature: "ai-pricing-coach", model, userId, status: "payment_required" });
      return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[ai-pricing-coach] gateway error", resp.status, t);
      await logAiUsage({ feature: "ai-pricing-coach", model, userId, status: "error", errorMessage: `gateway_${resp.status}` });
      return new Response(JSON.stringify({ error: "ai_gateway_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await resp.json();
    const commentary = json?.choices?.[0]?.message?.content?.trim?.() ?? "";
    const { inputTokens, outputTokens } = extractTokensFromResponse(json);
    await logAiUsage({
      feature: "ai-pricing-coach",
      model,
      userId,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startedAt,
      metadata: { role: body.role, region: body.region, zone },
    });

    return new Response(JSON.stringify({ facts, commentary }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-pricing-coach] unexpected", err);
    await logAiUsage({ feature: "ai-pricing-coach", model, userId, status: "error", errorMessage: err instanceof Error ? err.message : "unknown" });
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
