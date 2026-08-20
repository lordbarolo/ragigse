// ai-pricing-coach
// "Smart auto-pricing": Given user's role/region/employment + current rate, returns
// a neutral analysis (lowest acceptable, market median, top of band) with reasoning.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { logAiUsage, extractTokensFromResponse, checkAiRateLimit, aiRateLimitResponse } from "../_shared/ai-usage-logger.ts";
import { getAiGatewayUrl, getAiGatewayKey, getAiModel } from "../_shared/ai-transport.ts";
import {
  leaksForbiddenData,
  missingDataAnswer,
  MODEL_NOT_DISCLOSED,
  possibleRange,
  resolveZone,
} from "../_shared/rate-guard.ts";


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

/**
 * Möjlig ersättning ur kundpriset. Marginalmodellen och arbetsgivarfaktorn
 * kommer från den delade `rate-guard` — aldrig lokala konstanter.
 */
function calcRange(customerPrice: number, empType: "foretagare" | "anstalld", role: string) {
  const range = possibleRange(customerPrice, role, empType);
  return { hourly_min: range.min, hourly_max: range.max };
}


const SYSTEM = `Du är vårdbemanning.ai:s neutrala marknadsanalytiker. Aldrig "topp X%" eller social benchmarking.
Regler:
- Svara på svenska, max 5 meningar.
- Använd ENDAST de siffror du får (SKR-ramavtal). Hitta inte på.
- Beskriv ALDRIG hur beloppen räknas fram: inga marginaler, procentandelar, faktorer eller timmar per månad.
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
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized", message: "Du måste vara inloggad." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

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

  // Zonen härleds ur kommunen via den delade uppslagningen. Ingen gissning:
  // utan mappning returneras 422 i stället för priset för en godtycklig zon.
  const zone = await resolveZone(sb, body.region);
  if (!zone) {
    return new Response(JSON.stringify({
      error: "unknown_zone",
      message: missingDataAnswer([
        `vilken kommun eller närliggande ort som gäller (vi saknar uppgift för ${body.region})`,
      ]),
    }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const zoneRate = rates.find((r) => r.zon === zone);
  if (!zoneRate) {
    return new Response(JSON.stringify({
      error: "no_market_data",
      message: missingDataAnswer([
        `vilken roll som ligger närmast, eftersom vi saknar uppgift för ${body.role} i ${zone}`,
      ]),
    }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const empType = mapEmployment(body.employmentType);
  const range = calcRange(zoneRate.timpris_kund, empType, body.role);

  // Enforce safety threshold
  let safeMin = range.hourly_min;
  if (body.currentRate && body.currentRate > safeMin) {
    safeMin = body.currentRate;
  }

  // Råa kundpriser lämnar aldrig funktionen — de används bara som spärrlista.
  const forbiddenAmounts = (rates ?? []).map((r) => Math.round(Number(r.timpris_kund)));

  const facts = {
    role: body.role,
    region: body.region,
    zone,
    employmentType: empType,
    expectedRangeHour: { min: range.hourly_min, max: range.hourly_max },
    suggestedFloor: safeMin,
    currentRate: body.currentRate ?? null,
  };

  const LOVABLE_API_KEY = getAiGatewayKey();
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userPrompt = `Marknadsdata för konsulten (beloppen är färdigräknade — använd dem exakt som de står):
${JSON.stringify(facts, null, 2)}

Skriv en neutral marknadskommentar (max 5 meningar) som beskriver:
1) Att nivån utgår från regionernas ramavtal, utan att nämna regionens pris som siffra.
2) Möjlig ersättning (${range.hourly_min}–${range.hourly_max} kr/h).
3) En försiktig observation om förhandlingsutrymme givet det nuvarande timpriset (om angivet).
Ange inga procent, inga peer-jämförelser, ingen "push"-ton. Räkna aldrig själv.`;


  const model = getAiModel("google/gemini-3-flash-preview");
  try {
    const resp = await fetch(getAiGatewayUrl(), {
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
