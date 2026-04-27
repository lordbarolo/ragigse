import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { logAiUsage, extractTokensFromResponse, checkAiRateLimit, aiRateLimitResponse } from "../_shared/ai-usage-logger.ts";

async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

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
    description: "Extract structured timesheet data from a Swedish healthcare staffing timesheet PDF. Only extract work time types, dates, hours, and clock times. Do NOT extract names, workplaces, employers, or other metadata.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", description: "YYYY-MM or YYYY-Wxx for weekly reports" },
        format: {
          type: "string",
          enum: ["shifts", "weekly_summary"],
          description: "shifts = one row per shift with start/end times. weekly_summary = grid with hours per category per day.",
        },
        // Format A: shift-based rows
        rader: {
          type: "array",
          description: "Used when format=shifts. One entry per shift.",
          items: {
            type: "object",
            properties: {
              datum: { type: "string", description: "YYYY-MM-DD" },
              start_tid: { type: "string", description: "HH:MM" },
              slut_tid: { type: "string", description: "HH:MM or HH:MM+1 if past midnight" },
              typ: { type: "string", enum: ["ordinarie", "aktiv_jour", "passiv_jour", "beredskap"] },
              rast_minuter: { type: "number", description: "Break in minutes as stated in document. If not stated, use 0." },
            },
            required: ["datum", "start_tid", "slut_tid", "typ", "rast_minuter"],
            additionalProperties: false,
          },
        },
        // Format B: weekly summary grid
        daglig_summering: {
          type: "array",
          description: "Used when format=weekly_summary. One entry per day with hours broken down by category.",
          items: {
            type: "object",
            properties: {
              datum: { type: "string", description: "YYYY-MM-DD" },
              veckodag: { type: "string", description: "e.g. måndag, tisdag" },
              ar_helgdag: { type: "boolean", description: "True if the day is a Swedish public holiday (e.g. 1 maj, Kristi himmelsfärd)" },
              normaltid_timmar: { type: "number", description: "Hours of regular work (Normaltid)" },
              normaltid_minuter: { type: "number", description: "Extra minutes beyond full hours for Normaltid" },
              passiv_jour_timmar: { type: "number", description: "Hours of passive on-call (Passiv jour vardag OR helg)" },
              passiv_jour_minuter: { type: "number", description: "Extra minutes for passive on-call" },
              passiv_jour_typ: { type: "string", enum: ["vardag", "helg", "storhelg"], description: "Which passive jour category applies" },
              aktiv_jour_timmar: { type: "number", description: "Hours of active on-call work" },
              aktiv_jour_minuter: { type: "number", description: "Extra minutes for active on-call" },
              aktiv_jour_typ: { type: "string", enum: ["vardag_1721", "vardag_2108", "helg", "storhelg"], description: "Which active jour category applies" },
              ob_kvall_timmar: { type: "number", description: "OB evening hours (17-21)" },
              ob_natt_timmar: { type: "number", description: "OB night hours (21-06)" },
              rast_minuter: { type: "number", description: "Break in minutes as stated in document. If not stated, use 0." },
              total_timmar: { type: "number", description: "Total hours for this day" },
              total_minuter: { type: "number", description: "Extra minutes beyond full hours for total" },
            },
            required: ["datum", "veckodag", "ar_helgdag", "normaltid_timmar", "passiv_jour_timmar", "aktiv_jour_timmar", "total_timmar"],
            additionalProperties: false,
          },
        },
        // Totals from the document itself
        summering: {
          type: "object",
          description: "Summary totals as stated in the document",
          properties: {
            normaltid_total: { type: "string", description: "e.g. '37h 0m'" },
            passiv_jour_vardag_total: { type: "string", description: "e.g. '14h 30m'" },
            passiv_jour_helg_total: { type: "string", description: "e.g. '66h 30m'" },
            aktiv_jour_total: { type: "string", description: "e.g. '17h 30m'" },
            total_tid: { type: "string", description: "e.g. '135h 30m'" },
          },
          additionalProperties: false,
        },
      },
      required: ["period", "format"],
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

const SYSTEM_TIDRAPPORT_PASS1 = `Du extraherar arbetstidsdata ur svenska tidrapporter för vårdbemanning.

VIKTIGT: Extrahera ENBART arbetstidsdata — datum, klockslag, antal timmar och typ av arbetstid.
Extrahera INTE namn, arbetsplats, uppdragsgivare, ort eller annan metadata.

Anta INGENTING som inte uttryckligen anges i dokumentet. Om rast inte anges, ange 0. Om en tid inte syns, utelämna den.

Tidrapporter finns i två format:

**Format A (shifts):** En rad per arbetspass med start- och sluttid.
**Format B (weekly_summary):** En veckosammanfattning i tabellform med tidgrupper (Normaltid, Passiv jour vardag, Passiv jour helg, Vardag 17-21 Aktiv, Vardag 21-08 Aktiv, Helg Aktiv, etc.) och timmar per dag.

Identifiera rätt format och extrahera därefter.

**Regler för helgdagar:**
- 1 maj, 6 juni, Kristi himmelsfärd, julafton, juldagen, nyårsafton, nyårsdagen, påskdagen, pingstdagen etc. ska markeras som ar_helgdag=true
- Helgdagar räknas som helg/storhelg för jour, INTE som vardag — även om de infaller på en veckodag

**Regler för passiv/aktiv jour:**
- "Passiv jour vardag" = tillgänglig via telefon på vardagar
- "Passiv jour helg" = passiv jour på helg/helgdag
- "Vardag 17-21 Aktiv" / "Vardag 21-08 Aktiv" = aktiv jourtid på vardagar
- "Helg Aktiv" = aktivt arbete under jour på helg/helgdag

**Exempel — Format B (weekly_summary):**
Normaltid: 0, 9h30m, 9h0m, 8h30m, 10h0m, 0, 0 → Totalt 37h 0m
→ format: "weekly_summary", daglig_summering med en rad per dag

**Exempel — Format A (shifts):**
Rad: "15 jan 07:00-19:30 rast 30min"
→ {"datum":"2026-01-15","start_tid":"07:00","slut_tid":"19:30","typ":"ordinarie","rast_minuter":30}

Rad: "16 jan 07:00-16:00"
→ {"datum":"2026-01-16","start_tid":"07:00","slut_tid":"16:00","typ":"ordinarie","rast_minuter":0}

Läs av alla rader noga. Kontrollera att dina delsummor per dag stämmer med dokumentets "Total tid" per dag.`;

const SYSTEM_TIDRAPPORT_PASS2 = `Extrahera arbetstidsdata ur den bifogade svenska tidrapporten.

VIKTIGT: Extrahera ENBART datum, klockslag, antal timmar och typ av arbetstid.
Extrahera INTE namn, arbetsplats, uppdragsgivare eller annan metadata.
Anta INGENTING som inte uttryckligen anges. Om rast inte anges, sätt 0.

Tidrapporter kan vara antingen:
- **shifts**: En rad per arbetspass med klockslag
- **weekly_summary**: En tabell/grid med tidgrupper och timmar per dag

Var extra noggrann med:
1. **Helgdagar** — 1 maj, Kristi himmelsfärd etc. är helgdagar och jour på dessa ska klassas som helg
2. **Aktiv vs passiv jour** — "Passiv jour" = tillgänglig. "Aktiv" = faktiskt arbete under jourtid
3. **Minuter** — Läs av timmar OCH minuter korrekt (t.ex. "2h 30m" = 2 timmar, 30 minuter)
4. **Totaler** — Kontrollera att summan av alla dagar stämmer med dokumentets angivna total`;

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
  feature: string = "invoice-extract",
): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
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
  const durationMs = Date.now() - startedAt;

  if (!res.ok) {
    const body = await res.text();
    logAiUsage({
      feature,
      model,
      status: res.status === 429 ? "rate_limited" : res.status === 402 ? "payment_required" : "error",
      durationMs,
      errorMessage: `gateway_${res.status}: ${body.slice(0, 200)}`,
      metadata: { tool: tool.function.name },
    });
    throw new Error(`AI Gateway error [${res.status}]: ${body}`);
  }

  const data = await res.json();
  const { inputTokens, outputTokens } = extractTokensFromResponse(data);
  logAiUsage({
    feature,
    model,
    inputTokens,
    outputTokens,
    durationMs,
    metadata: { tool: tool.function.name, has_pdf: true },
  });

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
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
  start_tid?: string;
  slut_tid?: string;
  typ?: string;
  rast_minuter?: number;
  // Weekly summary fields
  normaltid_timmar?: number;
  passiv_jour_timmar?: number;
  aktiv_jour_timmar?: number;
  total_timmar?: number;
  [key: string]: unknown;
}

interface ComparisonResult {
  merged: TidrapportRad[];
  confidence: Array<{ index: number; match: boolean; pass1: TidrapportRad; pass2: TidrapportRad | null }>;
  overallConfidence: number;
}

function compareTidrapportPasses(
  pass1: Record<string, unknown>,
  pass2: Record<string, unknown>,
): ComparisonResult {
  const format1 = pass1.format as string;
  const format2 = pass2.format as string;

  // Determine which array to use based on format
  const rows1 = (format1 === "weekly_summary"
    ? (pass1.daglig_summering as TidrapportRad[])
    : (pass1.rader as TidrapportRad[])) ?? [];
  const rows2 = (format2 === "weekly_summary"
    ? (pass2.daglig_summering as TidrapportRad[])
    : (pass2.rader as TidrapportRad[])) ?? [];

  const confidence: ComparisonResult["confidence"] = [];
  const merged: TidrapportRad[] = [];

  for (let i = 0; i < rows1.length; i++) {
    const r1 = rows1[i];
    const r2 = rows2.find((r) => r.datum === r1.datum &&
      (r1.start_tid ? r.start_tid === r1.start_tid : true));

    let match = false;
    if (r2) {
      if (format1 === "weekly_summary") {
        // Compare hourly totals
        match =
          (r1.normaltid_timmar ?? 0) === (r2.normaltid_timmar ?? 0) &&
          (r1.passiv_jour_timmar ?? 0) === (r2.passiv_jour_timmar ?? 0) &&
          (r1.aktiv_jour_timmar ?? 0) === (r2.aktiv_jour_timmar ?? 0);
      } else {
        match =
          r1.slut_tid === r2.slut_tid &&
          r1.typ === r2.typ &&
          Math.abs((r1.rast_minuter ?? 0) - (r2.rast_minuter ?? 0)) < 1;
      }
    }

    confidence.push({ index: i, match, pass1: r1, pass2: r2 ?? null });
    merged.push(r1);
  }

  // Rows in pass2 not in pass1
  for (const r2 of rows2) {
    const exists = rows1.some((r1) => r1.datum === r2.datum &&
      (r1.start_tid ? r1.start_tid === r2.start_tid : true));
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

    // Per-user daily AI quota
    const userId = await getAuthUserId(req);
    const aiRl = await checkAiRateLimit(userId);
    if (!aiRl.allowed) return aiRateLimitResponse(aiRl, corsHeaders);

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    function parseTimeStr(t: string): number {
      const [h, m] = (t ?? "0:0").split(":").map(Number);
      return (h || 0) + (m || 0) / 60;
    }

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
      extractedTidrapport = {
        konsult_namn: "",
        uppdragsgivare: "",
        uppdragsort: "",
        period: "",
        format: "shifts",
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

      tidrapportConfidence = compareTidrapportPasses(tidPass1, tidPass2);

      const format = tidPass1.format as string;
      extractedTidrapport = {
        ...tidPass1,
        ...(format === "weekly_summary"
          ? { daglig_summering: tidrapportConfidence.merged }
          : { rader: tidrapportConfidence.merged }),
      };
    }

    // 5. Check for summa-diskrepans between extracted rows and document totals
    let summaDiskrepans: { beraknad: number; dokumentet: number } | null = null;
    if (extractedTidrapport) {
      const tr = extractedTidrapport as any;
      const summering = tr.summering;
      if (summering?.total_tid) {
        // Parse "135h 30m" format
        const match = (summering.total_tid as string).match(/(\d+)h\s*(\d+)?m?/);
        if (match) {
          const docTotalH = parseInt(match[1], 10) + (parseInt(match[2] || "0", 10) / 60);
          // Calculate sum from rows
          let rowTotal = 0;
          if (tr.format === "weekly_summary" && Array.isArray(tr.daglig_summering)) {
            rowTotal = tr.daglig_summering.reduce((sum: number, d: any) => sum + (d.total_timmar || 0) + (d.total_minuter || 0) / 60, 0);
          } else if (Array.isArray(tr.rader)) {
            for (const r of tr.rader) {
              const s = parseTimeStr(r.start_tid);
              let e = parseTimeStr((r.slut_tid || "").replace("+1", ""));
              if ((r.slut_tid || "").includes("+1") || e < s) e += 24;
              rowTotal += Math.max(0, e - s - (r.rast_minuter || 0) / 60);
            }
          }
          if (Math.abs(rowTotal - docTotalH) > 0.5) {
            summaDiskrepans = { beraknad: Math.round(rowTotal * 10) / 10, dokumentet: Math.round(docTotalH * 10) / 10 };
          }
        }
      }
    }

    // 6. Save to DB
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
              summa_diskrepans: summaDiskrepans,
            }
          : { overall: 1.0, rows: [], summa_diskrepans: null },
        extraction_model: model,
        ...(summaDiskrepans ? { har_avvikelse: true } : {}),
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
