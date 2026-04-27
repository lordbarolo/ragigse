// ai-explain-insight
// Plain-language förklaring av en insikt på konsultens dashboard.
// Tar emot { topic, role, region, employmentType, data } och returnerar 1-3 meningar.

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
  topic: z.enum(["zone_rates", "salary_zones", "upcoming_assignments"]),
  role: z.string().min(1).max(120).optional().nullable(),
  region: z.string().min(1).max(120).optional().nullable(),
  employmentType: z.string().max(40).optional().nullable(),
  data: z.unknown(),
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

const SYSTEM = `Du är CompCares neutrala marknadsanalytiker. Tonläge: Swiss-bank, lugn och faktabaserad.
Regler:
- Svara på svenska, max 2-3 korta meningar (under 60 ord totalt).
- Aldrig säga "du borde", "du tjänar mer än X%", "topp 20%" eller liknande peer-jämförelser.
- Aldrig hänvisa till SCB för konsultersättningar.
- Aldrig påstå att uppdrag är "live", "pågående" eller "realtid" — endast historiska mönster.
- Förklara vad siffrorna betyder, inte vad användaren ska göra.
- Inga emojis, inga listor, ingen markdown.`;

function buildUserPrompt(topic: string, role: string | null | undefined, region: string | null | undefined, employmentType: string | null | undefined, data: unknown): string {
  const ctx = `Roll: ${role || "okänd"}. Region: ${region || "okänd"}. Anställningsform: ${employmentType || "okänd"}.`;
  const dataStr = JSON.stringify(data).slice(0, 1500);
  switch (topic) {
    case "zone_rates":
      return `${ctx}\n\nDessa är ramavtalspriser (kundpris per timme) per geografisk zon för rollen, hämtade från SKR-ramavtal:\n${dataStr}\n\nFörklara kort vad mönstret betyder och varför priserna skiljer sig mellan zoner.`;
    case "salary_zones":
      return `${ctx}\n\nDessa är förväntade ersättningsspann per zon för konsulten, baserade på ramavtalspriser och branschmarginal:\n${dataStr}\n\nFörklara kort vad spannen betyder för en konsult i denna roll.`;
    case "upcoming_assignments":
      return `${ctx}\n\nDessa är historiska avropsmönster (INTE pågående uppdrag) som används för att indikera marknadens aktivitet:\n${dataStr}\n\nFörklara kort vad mönstret säger om historisk efterfrågan i regionen. Säg INTE att uppdragen är live.`;
    default:
      return `${ctx}\n\nData:\n${dataStr}\n\nFörklara kort vad detta visar.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const startedAt = Date.now();
  const userId = await getAuthUserId(req);

  // Rate limit (shared per-user 30/day across all AI tools)
  const rl = await checkAiRateLimit(userId);
  if (!rl.allowed) {
    await logAiUsage({ feature: "ai-explain-insight", model: "google/gemini-3-flash-preview", userId, status: "rate_limited" });
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

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const model = "google/gemini-3-flash-preview";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildUserPrompt(body.topic, body.role, body.region, body.employmentType, body.data) },
        ],
        temperature: 0.4,
      }),
    });

    if (resp.status === 429) {
      await logAiUsage({ feature: "ai-explain-insight", model, userId, status: "rate_limited" });
      return new Response(JSON.stringify({ error: "rate_limited", message: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      await logAiUsage({ feature: "ai-explain-insight", model, userId, status: "payment_required" });
      return new Response(JSON.stringify({ error: "payment_required", message: "AI-krediter saknas. Kontakta admin." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[ai-explain-insight] gateway error", resp.status, t);
      await logAiUsage({ feature: "ai-explain-insight", model, userId, status: "error", errorMessage: `gateway_${resp.status}` });
      return new Response(JSON.stringify({ error: "ai_gateway_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await resp.json();
    const explanation = json?.choices?.[0]?.message?.content?.trim?.() ?? "";
    const { inputTokens, outputTokens } = extractTokensFromResponse(json);
    await logAiUsage({
      feature: "ai-explain-insight",
      model,
      userId,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startedAt,
      metadata: { topic: body.topic },
    });

    return new Response(JSON.stringify({ explanation }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-explain-insight] unexpected", err);
    await logAiUsage({ feature: "ai-explain-insight", model, userId, status: "error", errorMessage: err instanceof Error ? err.message : "unknown" });
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
