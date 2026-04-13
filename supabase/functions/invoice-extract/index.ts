import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tool-calling schemas ─────────────────────────────────────────────────────

const TIDRAPPORT_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_tidrapport",
    description: "Extract structured timesheet data from a Swedish healthcare staffing timesheet PDF.",
    parameters: {
      type: "object",
      properties: {
        konsult_namn: { type: "string", description: "Consultant name" },
        uppdragsgivare: { type: "string", description: "Client/employer" },
        uppdragsort: { type: "string", description: "City/municipality" },
        period: { type: "string", description: "YYYY-MM" },
        rader: {
          type: "array",
          items: {
            type: "object",
            properties: {
              datum: { type: "string", description: "YYYY-MM-DD" },
              start_tid: { type: "string", description: "HH:MM" },
              slut_tid: { type: "string", description: "HH:MM or HH:MM+1 if past midnight" },
              typ: { type: "string", enum: ["ordinarie", "jour", "beredskap"] },
              rast_minuter: { type: "number" },
            },
            required: ["datum", "start_tid", "slut_tid", "typ", "rast_minuter"],
            additionalProperties: false,
          },
        },
      },
      required: ["konsult_namn", "uppdragsgivare", "uppdragsort", "period", "rader"],
      additionalProperties: false,
    },
  },
};

const FAKTURA_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_faktura",
    description: "Extract structured invoice data from a Swedish healthcare staffing invoice PDF.",
    parameters: {
      type: "object",
      properties: {
        fakturanummer: { type: "string" },
        fakturadatum: { type: "string", description: "YYYY-MM-DD" },
        leverantor: { type: "string" },
        konsult_namn: { type: "string" },
        region: { type: "string" },
        uppdragsort: { type: "string" },
        period: { type: "string", description: "YYYY-MM" },
        rader: {
          type: "array",
          items: {
            type: "object",
            properties: {
              beskrivning: { type: "string" },
              antal_timmar: { type: "number" },
              a_pris: { type: "number" },
              summa: { type: "number" },
              typ: {
                type: "string",
                enum: ["grundpris", "ob_tillagg", "jour_beredskap", "reseschablon", "avdrag", "ovrigt"],
              },
            },
            required: ["beskrivning", "antal_timmar", "a_pris", "summa", "typ"],
            additionalProperties: false,
          },
        },
        summa_exkl_moms: { type: "number" },
        moms: { type: "number" },
        summa_inkl_moms: { type: "number" },
      },
      required: [
        "fakturanummer", "fakturadatum", "leverantor", "konsult_namn",
        "region", "uppdragsort", "period", "rader",
        "summa_exkl_moms", "moms", "summa_inkl_moms",
      ],
      additionalProperties: false,
    },
  },
};

// ── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_TIDRAPPORT_PASS1 = `Du extraherar data ur svenska tidrapporter för vårdbemanning. Fokusera på varje rad/skift. Om sluttid är efter midnatt, ange "+1" i slut_tid. Rast = 0 om inte angiven. Typ = "ordinarie" om osäkert.

Exempel på korrekt extraktion:
Rad i tidrapport: "15 jan  07:00-19:30 rast 30min"
→ {"datum":"2026-01-15","start_tid":"07:00","slut_tid":"19:30","typ":"ordinarie","rast_minuter":30}

Rad i tidrapport: "20 jan  19:00-07:00 natt"
→ {"datum":"2026-01-20","start_tid":"19:00","slut_tid":"07:00+1","typ":"ordinarie","rast_minuter":0}

Rad i tidrapport: "Jour 22 jan 21:00-08:00"
→ {"datum":"2026-01-22","start_tid":"21:00","slut_tid":"08:00+1","typ":"jour","rast_minuter":0}`;

const SYSTEM_TIDRAPPORT_PASS2 = `Extrahera varje arbetspass ur den bifogade svenska tidrapporten. Var noggrann med datum, start- och sluttider, raster. Om passet korsar midnatt lägg till "+1" efter sluttiden. Om du inte kan avgöra typ, sätt "ordinarie". Läs kolumner noga — ibland anges timmar eller totaler i kolumner bredvid tiden.

Exempelextraktioner:
{"datum":"2026-02-03","start_tid":"07:00","slut_tid":"16:00","typ":"ordinarie","rast_minuter":60}
{"datum":"2026-02-04","start_tid":"21:00","slut_tid":"07:00+1","typ":"ordinarie","rast_minuter":0}
{"datum":"2026-02-10","start_tid":"07:00","slut_tid":"21:00","typ":"jour","rast_minuter":30}`;

const SYSTEM_FAKTURA_PASS1 = `Du extraherar data ur svenska fakturor inom vårdbemanning (nationellt hyrbemanningsavtal). Identifiera varje fakturarad och klassificera som grundpris, ob_tillagg, jour_beredskap, reseschablon, avdrag eller ovrigt. Summor ska matcha fakturans totaler.

Exempel:
Rad: "Sjuksköterska, ordinarie tid 160h à 770kr = 123 200kr"
→ {"beskrivning":"Sjuksköterska, ordinarie tid","antal_timmar":160,"a_pris":770,"summa":123200,"typ":"grundpris"}

Rad: "OB-tillägg kväll 24h à 37kr = 888kr"
→ {"beskrivning":"OB-tillägg kväll","antal_timmar":24,"a_pris":37,"summa":888,"typ":"ob_tillagg"}`;

const SYSTEM_FAKTURA_PASS2 = `Extrahera all strukturerad data ur denna svenska vårdbemanning-faktura. Varje rad ska klassificeras. Var noggrann med à-priser, timantal och summor. Dubbelkolla att radsummorna stämmer med totalen.`;

// ── AI call ──────────────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  pdfBase64: string,
  tool: typeof TIDRAPPORT_TOOL | typeof FAKTURA_TOOL,
): Promise<Record<string, unknown>> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
            },
            { type: "text", text: "Extrahera data ur detta dokument." },
          ],
        },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI Gateway error [${res.status}]: ${body}`);
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    // Fallback: try to parse content as JSON
    const content = data.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No tool call or JSON in response");
  }

  return JSON.parse(toolCall.function.arguments);
}

// ── Dual-pass comparison ─────────────────────────────────────────────────────

interface TidrapportRad {
  datum: string;
  start_tid: string;
  slut_tid: string;
  typ: string;
  rast_minuter: number;
}

interface ComparisonResult {
  merged: TidrapportRad[];
  confidence: Array<{ index: number; match: boolean; pass1: TidrapportRad; pass2: TidrapportRad | null }>;
  overallConfidence: number;
}

function compareTidrapportPasses(
  pass1: { rader: TidrapportRad[] },
  pass2: { rader: TidrapportRad[] },
): ComparisonResult {
  const rows1 = pass1.rader ?? [];
  const rows2 = pass2.rader ?? [];
  const confidence: ComparisonResult["confidence"] = [];
  const merged: TidrapportRad[] = [];

  for (let i = 0; i < rows1.length; i++) {
    const r1 = rows1[i];
    // Find matching row in pass2 by datum
    const r2 = rows2.find(
      (r) => r.datum === r1.datum && r.start_tid === r1.start_tid,
    );

    const match = r2
      ? r1.slut_tid === r2.slut_tid &&
        r1.typ === r2.typ &&
        Math.abs((r1.rast_minuter ?? 0) - (r2.rast_minuter ?? 0)) < 1
      : false;

    confidence.push({ index: i, match, pass1: r1, pass2: r2 ?? null });
    merged.push(r1); // Use pass1 as base
  }

  // Check for rows in pass2 not in pass1
  for (const r2 of rows2) {
    const exists = rows1.some(
      (r1) => r1.datum === r2.datum && r1.start_tid === r2.start_tid,
    );
    if (!exists) {
      const idx = merged.length;
      merged.push(r2);
      confidence.push({ index: idx, match: false, pass1: r2, pass2: null });
    }
  }

  const matchCount = confidence.filter((c) => c.match).length;
  const overallConfidence = confidence.length > 0 ? matchCount / confidence.length : 1;

  return { merged, confidence, overallConfidence };
}

// ── Download helper ──────────────────────────────────────────────────────────

async function downloadPdfBase64(
  supabase: ReturnType<typeof createClient>,
  path: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from("invoice_reviews").download(path);
  if (error || !data) throw new Error(`Failed to download ${path}: ${error?.message}`);
  const buffer = await data.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    // 1. Get review
    const { data: review, error: reviewErr } = await supabase
      .from("invoice_reviews")
      .select("*")
      .eq("id", review_id)
      .single();
    if (reviewErr || !review) throw new Error("Review not found: " + reviewErr?.message);

    await supabase.from("invoice_reviews").update({ status: "extracting" }).eq("id", review_id);

    const model = "google/gemini-3-flash-preview";

    // 2. Download PDFs
    const fakturaPdf = await downloadPdfBase64(supabase, review.faktura_path);

    // 3. Extract faktura (dual-pass, parallel)
    const [fakturaPass1, fakturaPass2] = await Promise.all([
      callGemini(LOVABLE_API_KEY, model, SYSTEM_FAKTURA_PASS1, fakturaPdf, FAKTURA_TOOL),
      callGemini(LOVABLE_API_KEY, model, SYSTEM_FAKTURA_PASS2, fakturaPdf, FAKTURA_TOOL),
    ]);

    // 4. Extract tidrapport (only if not manual)
    let extractedTidrapport: Record<string, unknown> | null = null;
    let tidrapportConfidence: ComparisonResult | null = null;

    if (review.manual_tidrapport && Array.isArray(review.manual_tidrapport) && review.manual_tidrapport.length > 0) {
      // Use manual data directly — full confidence
      extractedTidrapport = {
        konsult_namn: "",
        uppdragsgivare: "",
        uppdragsort: "",
        period: "",
        rader: review.manual_tidrapport,
      };
      tidrapportConfidence = {
        merged: review.manual_tidrapport,
        confidence: review.manual_tidrapport.map((_: unknown, i: number) => ({
          index: i,
          match: true,
          pass1: review.manual_tidrapport[i],
          pass2: review.manual_tidrapport[i],
        })),
        overallConfidence: 1.0,
      };
    } else if (review.tidrapport_path) {
      const tidrapportPdf = await downloadPdfBase64(supabase, review.tidrapport_path);
      const [tidPass1, tidPass2] = await Promise.all([
        callGemini(LOVABLE_API_KEY, model, SYSTEM_TIDRAPPORT_PASS1, tidrapportPdf, TIDRAPPORT_TOOL),
        callGemini(LOVABLE_API_KEY, model, SYSTEM_TIDRAPPORT_PASS2, tidrapportPdf, TIDRAPPORT_TOOL),
      ]);

      tidrapportConfidence = compareTidrapportPasses(
        tidPass1 as { rader: TidrapportRad[] },
        tidPass2 as { rader: TidrapportRad[] },
      );

      extractedTidrapport = {
        ...tidPass1,
        rader: tidrapportConfidence.merged,
      };
    }

    // 5. Save to DB
    await supabase
      .from("invoice_reviews")
      .update({
        status: "extracted",
        extracted_faktura: fakturaPass1,
        extracted_tidrapport: extractedTidrapport,
        extraction_confidence: tidrapportConfidence
          ? {
              overall: tidrapportConfidence.overallConfidence,
              rows: tidrapportConfidence.confidence,
            }
          : { overall: 1.0, rows: [] },
        extraction_model: model,
      })
      .eq("id", review_id);

    // 6. Return result
    return new Response(
      JSON.stringify({
        success: true,
        faktura: fakturaPass1,
        tidrapport: extractedTidrapport,
        confidence: tidrapportConfidence
          ? {
              overall: tidrapportConfidence.overallConfidence,
              rows: tidrapportConfidence.confidence,
            }
          : { overall: 1.0, rows: [] },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("invoice-extract error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      const body = await req.clone().json();
      if (body?.review_id) {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("invoice_reviews")
          .update({ status: "error", error_message: message })
          .eq("id", body.review_id);
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
