/**
 * parse-avrop
 *
 * Tar emot antingen text eller en bild (base64 data URL) av ett avrop och
 * returnerar strukturerade fält för förifyllning av representationsintyget.
 *
 * Använder Lovable AI Gateway (Gemini Flash, multimodal).
 */
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

const SYSTEM_PROMPT = `Du extraherar fält från svenska vårdavrop till bemanningskonsulter.

Returnera ALLTID ett JSON-objekt med dessa fält (null om okänt):
- region: en av: ${SWEDISH_REGIONS.join(", ")}. Mappa "VGR" → "Västra Götalandsregionen", "Region Sthlm" → "Region Stockholm" etc.
- unit: enheten/vårdcentralen/avdelningen som beställer (fritext, ex "Vårdcentralen Mölnlycke", "Akutmottagningen Sahlgrenska")
- competence: yrkesroll/specialitet (ex "Specialistläkare allmänmedicin", "Sjuksköterska", "Anestesisjuksköterska")
- period_start: YYYY-MM-DD eller null
- period_end: YYYY-MM-DD eller null
- response_deadline: YYYY-MM-DD eller null (sista svarsdag/sista anbudsdag)
- assignment_id: avropsnummer/uppdrags-ID om angivet (ex "KS-2026-0142") eller null

Svara endast med JSON, ingen prosa.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "AI gateway not configured" }, 500);
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

    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return jsonResponse({ error: "rate_limited" }, 429);
      }
      if (aiResponse.status === 402) {
        return jsonResponse({ error: "credits_exhausted" }, 402);
      }
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

    // Sanitera region — måste finnas i listan annars null
    if (parsed.region && !SWEDISH_REGIONS.includes(parsed.region)) {
      parsed.region = null;
    }

    return jsonResponse({ extracted: parsed });
  } catch (err) {
    console.error("parse-avrop error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
