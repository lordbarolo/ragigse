// ai-invoice-to-email
// Genererar ett mejlutkast (ämne + brödtext) baserat på en fakturaavvikelse.
// Returnerar { subject, body, mailtoUrl } — ingen e-post skickas från servern.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { logAiUsage, extractTokensFromResponse, checkAiRateLimit, aiRateLimitResponse } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FindingSchema = z.object({
  invoiceRef: z.string().max(120).optional(),
  workedHours: z.number().nonnegative().optional(),
  invoicedHours: z.number().nonnegative().optional(),
  diffHours: z.number().optional(),
  diffAmountSek: z.number().optional(),
  type: z.enum(["A1", "A2", "A3", "A4", "ob_missing", "weekend_missing", "oncall_missing", "other"]).optional(),
  description: z.string().max(800).optional(),
});

const BodySchema = z.object({
  recipientName: z.string().max(120).optional(),
  recipientEmail: z.string().email().optional(),
  consultantName: z.string().max(120).optional(),
  agencyName: z.string().max(160).optional(),
  findings: z.array(FindingSchema).min(1).max(10),
  totalRecoverable: z.number().optional(),
  tone: z.enum(["neutral", "formal", "friendly"]).optional().default("neutral"),
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

const SYSTEM = `Du är en svensk affärsskribent som hjälper sjukvårdskonsulter att begära tilläggsfakturering eller korrigering från sitt bemanningsbolag.

Tonläge: Professionell, saklig, vänlig men bestämd. Aldrig anklagande. Aldrig juridiska hot.
Regler:
- Skriv på svenska.
- Kort ämnesrad (max 70 tecken).
- Brödtext: 4-7 meningar. Inled med kontext, presentera avvikelsen med siffror, be om åtgärd, avsluta artigt.
- Bifoga ALDRIG faktiska personuppgifter du inte fått.
- Hänvisa till "tidrapport" och "faktura" som källor.
- Avsluta med "Med vänlig hälsning,\\n[Konsultens namn]" om namn finns.
- Inga emojis, inga listpunkter med bullets.
- Returnera ENDAST giltig JSON: { "subject": "...", "body": "..." }. Ingen markdown-wrapping.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const startedAt = Date.now();
  const userId = await getAuthUserId(req);

  const rl = await checkAiRateLimit(userId);
  if (!rl.allowed) {
    await logAiUsage({ feature: "ai-invoice-to-email", model: "google/gemini-3-flash-preview", userId, status: "rate_limited" });
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

  const userPrompt = `Skapa ett mejlutkast med följande underlag:

Mottagare: ${body.recipientName || "Bemanningsbolag"}${body.agencyName ? ` (${body.agencyName})` : ""}
Avsändare: ${body.consultantName || "Konsult"}
Tonläge: ${body.tone}

Avvikelser (${body.findings.length} st):
${body.findings.map((f, i) => `${i + 1}. ${f.description || f.type || "Avvikelse"}${f.invoiceRef ? ` — Faktura ${f.invoiceRef}` : ""}${f.diffHours != null ? ` (${f.diffHours > 0 ? "+" : ""}${f.diffHours} h)` : ""}${f.diffAmountSek != null ? ` ≈ ${f.diffAmountSek.toLocaleString("sv-SE")} kr` : ""}`).join("\n")}

${body.totalRecoverable ? `Totalt belopp att tilläggsfakturera: ca ${body.totalRecoverable.toLocaleString("sv-SE")} kr.\n` : ""}
Skriv professionellt och be om återkoppling inom 7 arbetsdagar. Returnera JSON enligt formatet i system-instruktionen.`;

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
        temperature: 0.5,
        tools: [{
          type: "function",
          function: {
            name: "compose_email",
            description: "Returnerar mejlutkast",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Ämnesrad, max 70 tecken." },
                body: { type: "string", description: "Brödtext på svenska, 4-7 meningar." },
              },
              required: ["subject", "body"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "compose_email" } },
      }),
    });

    if (resp.status === 429) {
      await logAiUsage({ feature: "ai-invoice-to-email", model, userId, status: "rate_limited" });
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      await logAiUsage({ feature: "ai-invoice-to-email", model, userId, status: "payment_required" });
      return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[ai-invoice-to-email] gateway", resp.status, t);
      await logAiUsage({ feature: "ai-invoice-to-email", model, userId, status: "error", errorMessage: `gateway_${resp.status}` });
      return new Response(JSON.stringify({ error: "ai_gateway_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await resp.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    let subject = "Förfrågan om korrigering av tidigare fakturering";
    let bodyText = "";
    try {
      const args = JSON.parse(toolCall?.function?.arguments || "{}");
      subject = (args.subject || subject).toString().slice(0, 200);
      bodyText = (args.body || "").toString();
    } catch {
      // Fallback to plain content
      bodyText = json?.choices?.[0]?.message?.content?.trim?.() ?? "";
    }

    const { inputTokens, outputTokens } = extractTokensFromResponse(json);
    await logAiUsage({
      feature: "ai-invoice-to-email",
      model,
      userId,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startedAt,
      metadata: { findings_count: body.findings.length, has_email: !!body.recipientEmail },
    });

    const mailtoUrl = body.recipientEmail
      ? `mailto:${encodeURIComponent(body.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`
      : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    return new Response(JSON.stringify({ subject, body: bodyText, mailtoUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-invoice-to-email] unexpected", err);
    await logAiUsage({ feature: "ai-invoice-to-email", model, userId, status: "error", errorMessage: err instanceof Error ? err.message : "unknown" });
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
