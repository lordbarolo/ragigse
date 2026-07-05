// ai-consultant-coach
// Personlig konsult-coach. Streaming chat. Får konsultens kontext (roll, region, erfarenhet)
// och svarar neutralt på karriärrelaterade frågor.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAiGatewayUrl, getAiGatewayKey, getAiModel } from "../_shared/ai-transport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Msg { role: "user" | "assistant"; content: string }
interface Body {
  messages: Msg[];
  context?: {
    role?: string | null;
    region?: string | null;
    employmentType?: string | null;
    experienceYears?: number | null;
    currentRate?: number | null;
  };
}

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

function buildSystem(ctx: Body["context"]): string {
  const role = ctx?.role || "okänd roll";
  const region = ctx?.region || "okänd region";
  const emp = ctx?.employmentType || "okänd anställningsform";
  const exp = ctx?.experienceYears != null ? `${ctx.experienceYears} år` : "okänd erfarenhet";
  const rate = ctx?.currentRate ? `${ctx.currentRate} kr/h` : "ej angivet";

  return `Du är CompCares personliga konsult-coach. Du hjälper svenska sjukvårdskonsulter (sjuksköterskor, läkare, barnmorskor) med karriärfrågor, förhandling, dokumentation och uppdragssökning.

Konsultens kontext:
- Roll: ${role}
- Region: ${region}
- Anställningsform: ${emp}
- Erfarenhet: ${exp}
- Nuvarande timpris: ${rate}

Tonläge: Swiss-bank, lugn, faktabaserad, neutral. Aldrig "push", aldrig "topp X%", aldrig peer-jämförelser.

Hårda regler:
- Endast SKR-ramavtal + branschmarginal för konsultersättning. ALDRIG SCB.
- Aldrig föreslå lägre ersättning än konsultens nuvarande timpris.
- Vid frågor om ersättningsdata, hänvisa till konsultens dashboard ("Förväntad ersättningsnivå").
- Vid frågor om fakturagranskning: nämn att tjänsten är no-cure-no-pay (25% + moms av tilläggsfakturerat belopp).
- Vid frågor om referenser: hänvisa till Ref-ID och plingar.
- Vid frågor om dokument: hänvisa till Din data och samarbetsintyg.
- Aldrig hänvisa till "live" eller "pågående" uppdrag — endast historiska mönster i Uppdragsradar.
- Använd korta, tydliga svar (max 5 meningar). Markdown är OK.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = await getAuthUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Soft daily rate limit (re-using DB function)
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const r = await fetch(`${url}/rest/v1/rpc/check_ai_rate_limit`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ _user_id: userId, _daily_limit: 30 }),
    });
    if (r.ok) {
      const rl = await r.json();
      if (!rl.allowed) {
        return new Response(JSON.stringify({ error: "rate_limited", message: `Du har nått dagens gräns på ${rl.limit} AI-anrop. Återställs vid midnatt.` }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
  } catch (e) { console.error("rate-limit check failed", e); }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const LOVABLE_API_KEY = getAiGatewayKey();
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const resp = await fetch(getAiGatewayUrl(), {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getAiModel("google/gemini-3-flash-preview"),
        messages: [
          { role: "system", content: buildSystem(body.context) },
          ...body.messages.slice(-12),
        ],
        stream: true,
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "payment_required", message: "AI-krediter saknas." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok || !resp.body) {
      const t = await resp.text();
      console.error("[ai-consultant-coach] gateway", resp.status, t);
      return new Response(JSON.stringify({ error: "ai_gateway_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("[ai-consultant-coach] unexpected", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
