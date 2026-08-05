/**
 * parse-avrop
 *
 * Tar emot text och/eller bild av ett vårdavrop och returnerar:
 *   1. intyg_fields  → används för förifyllning av intygsformuläret
 *   2. intelligence  → utökad marknadsdata (pris, volym, krav, källa, etc.)
 *
 * All extraherad data + rådata loggas till `avrop_intelligence` för
 * långsiktig marknadsanalys. Råtext/bild rensas automatiskt efter 3 dagar
 * av en cron-funktion (redact_avrop_intelligence_pii).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAiRateLimit, aiRateLimitResponse } from "../_shared/ai-usage-logger.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SWEDISH_REGIONS = [
  "Region Blekinge", "Region Dalarna", "Region Gotland", "Region Gävleborg",
  "Region Halland", "Region Jämtland Härjedalen", "Region Jönköpings län",
  "Region Kalmar län", "Region Kronoberg", "Region Norrbotten", "Region Skåne",
  "Region Stockholm", "Region Sörmland", "Region Uppsala", "Region Värmland",
  "Region Västerbotten", "Region Västernorrland", "Region Västmanland",
  "Region Örebro län", "Region Östergötland", "Västra Götalandsregionen",
];

const SYSTEM_PROMPT = `Du extraherar ALL relevant data från svenska vårdavrop till bemanningskonsulter.

Returnera ALLTID ett JSON-objekt med följande struktur (använd null för okända fält):

{
  "intyg_fields": {
    "region": "en av: ${SWEDISH_REGIONS.join(", ")} (mappa 'VGR'→'Västra Götalandsregionen', 'Region Sthlm'→'Region Stockholm')",
    "unit": "vårdcentralen/avdelningen som beställer (fritext)",
    "competence": "yrkesroll/specialitet",
    "period_start": "YYYY-MM-DD",
    "period_end": "YYYY-MM-DD",
    "response_deadline": "YYYY-MM-DD (sista anbudsdag)",
    "assignment_id": "avropsnummer/uppdrags-ID"
  },
  "intelligence": {
    "avrop_received_at": "YYYY-MM-DD (datum avropet skickades ut, om angivet)",
    "source": "adda | region_direct | private | other",
    "customer_type": "region | kommun | private",
    "buyer_name": "vårdgivare/beställare i klartext",
    "price_type": "hourly | fixed | cap (takpris)",
    "price_min": "siffra utan valuta, ex 1180",
    "price_max": "siffra utan valuta, ex 1450",
    "price_unit": "SEK/h | SEK total",
    "on_call_required": true/false,
    "ob_required": true/false,
    "hours_per_week": "siffra, ex 40",
    "shifts_count": "antal pass om angivet",
    "duration_weeks": "uppdragets längd i veckor",
    "requirements": {
      "journal_system": "ex Cosmic, TakeCare, Melior, Obstetrix",
      "languages": ["svenska", "engelska"],
      "certifications": ["legitimation", "specialistbevis"],
      "experience_years": "siffra om krav anges",
      "drivers_license": true/false,
      "other_requirements": "fritext"
    },
    "housing_included": true/false,
    "travel_included": true/false
  }
}

Svara endast med JSON, ingen prosa.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "AI gateway not configured" }, 500);
    }

    // Require authenticated user — prevents anonymous AI usage and anonymous
    // writes to avrop_intelligence (the agencyId at line ~195 is read from
    // the same request below).
    // Admin-only: parse-avrop skriver till avrop_intelligence och kostar AI-anrop.
    const adminAuth = await requireAdmin(req);
    if (adminAuth instanceof Response) return adminAuth;
    const userId = adminAuth.userId;
    // Per-user daily AI quota
    const aiRl = await checkAiRateLimit(userId);
    if (!aiRl.allowed) {
      return new Response(JSON.stringify({
        error: "rate_limited",
        message: `Du har nått dagens gräns på ${aiRl.limit} AI-anrop. Återställs vid midnatt.`,
        used: aiRl.used,
        limit: aiRl.limit,
        resets_at: aiRl.resets_at,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, imageDataUrl } = await req.json();
    if (!text && !imageDataUrl) {
      return jsonResponse({ error: "Provide either text or imageDataUrl" }, 400);
    }

    const userContent: any[] = [];
    if (text) {
      userContent.push({
        type: "text",
        text: `Extrahera fält från detta avrop:\n\n${text}`,
      });
    }
    if (imageDataUrl) {
      userContent.push({
        type: "text",
        text: text
          ? "Använd även bilden nedan om något fält saknas i texten."
          : "Extrahera fält från bilden av avropet.",
      });
      userContent.push({
        type: "image_url",
        image_url: { url: imageDataUrl },
      });
    }

    const inputType = text && imageDataUrl ? "both" : (imageDataUrl ? "image" : "text");
    const startTs = Date.now();
    const model = "google/gemini-2.5-flash";

    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const latencyMs = Date.now() - startTs;

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) return jsonResponse({ error: "rate_limited" }, 429);
      if (aiResponse.status === 402) return jsonResponse({ error: "credits_exhausted" }, 402);
      return jsonResponse({ error: "AI extraction failed" }, 500);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI JSON:", rawContent);
      return jsonResponse({ error: "Invalid AI response" }, 500);
    }

    const intygFields = parsed.intyg_fields || {};
    const intelligence = parsed.intelligence || {};

    // Sanitera region
    if (intygFields.region && !SWEDISH_REGIONS.includes(intygFields.region)) {
      intygFields.region = null;
    }

    // Logga till avrop_intelligence (best-effort, blockera ej svar)
    const agencyId = await getAuthUserId(req);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let intelligenceId: string | null = null;
    try {
      const { data: inserted } = await admin
        .from("avrop_intelligence")
        .insert({
          agency_id: agencyId,
          region: intygFields.region || null,
          unit: intygFields.unit || null,
          competence: intygFields.competence || null,
          period_start: intygFields.period_start || null,
          period_end: intygFields.period_end || null,
          response_deadline: intygFields.response_deadline || null,
          assignment_id: intygFields.assignment_id || null,
          avrop_received_at: intelligence.avrop_received_at || null,
          source: intelligence.source || null,
          customer_type: intelligence.customer_type || null,
          buyer_name: intelligence.buyer_name || null,
          price_type: intelligence.price_type || null,
          price_min: intelligence.price_min ?? null,
          price_max: intelligence.price_max ?? null,
          price_unit: intelligence.price_unit || null,
          on_call_required: intelligence.on_call_required ?? null,
          ob_required: intelligence.ob_required ?? null,
          hours_per_week: intelligence.hours_per_week ?? null,
          shifts_count: intelligence.shifts_count ?? null,
          duration_weeks: intelligence.duration_weeks ?? null,
          requirements: intelligence.requirements || {},
          housing_included: intelligence.housing_included ?? null,
          travel_included: intelligence.travel_included ?? null,
          raw_text: text || null,
          // raw_image_path: TODO när bilduppladdning till storage införs
          extraction_model: model,
          extraction_latency_ms: latencyMs,
          input_type: inputType,
          extra_fields: parsed.extra_fields || {},
        })
        .select("id")
        .single();
      intelligenceId = inserted?.id || null;
    } catch (logErr) {
      console.error("avrop_intelligence insert failed (non-fatal):", logErr);
    }

    return jsonResponse({
      extracted: intygFields,           // Bakåtkompatibel
      intelligence,                     // Ny full data
      intelligence_id: intelligenceId,  // Använd vid intygskapande för att länka
    });
  } catch (err) {
    console.error("parse-avrop error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
