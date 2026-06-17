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
          description: "Used when format=shifts. One entry per shift across ALL pages and ALL weeks in the document.",
          items: {
            type: "object",
            properties: {
              datum: { type: "string", description: "YYYY-MM-DD. Derived from the year stated in the document and the day/month on the row." },
              veckodag: { type: "string", description: "e.g. måndag, tisdag, lördag, söndag" },
              start_tid: { type: "string", description: "HH:MM" },
              slut_tid: { type: "string", description: "HH:MM. Append '+1' if the shift ends after midnight, e.g. '07:15+1'." },
              typ: { type: "string", enum: ["ordinarie", "aktiv_jour", "passiv_jour", "beredskap"] },
              rast_minuter: { type: "number", description: "Break in minutes as stated in document. If not stated, use 0." },
              ar_helgdag: { type: "boolean", description: "True if the day is Saturday, Sunday, or a Swedish public holiday (1 maj, Kristi himmelsfärd, midsommarafton, julafton etc.)" },
            },
            required: ["datum", "start_tid", "slut_tid", "typ", "rast_minuter", "ar_helgdag"],
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
            total_tid: { type: "string", description: "Document's stated total as text, e.g. '135h 30m' or '30,25 timmar' or '60.25 h'" },
            total_timmar: { type: "number", description: "Document's stated total parsed to a decimal number, e.g. 135.5 for '135h 30m', 60.25 for '30,25 + 30 timmar'. Sum across all weeks if document spans multiple weeks." },
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

KRITISKT — LÄS HELA DOKUMENTET:
- Tidrapporter sträcker sig OFTA över FLERA SIDOR och FLERA VECKOR i samma PDF.
- Du MÅSTE läsa varje sida och inkludera ALLA pass från ALLA veckor i listan "rader".
- Om dokumentet visar v16 OCH v17, extrahera pass från BÅDA veckorna. Hoppa aldrig över sidor.
- Innan du svarar: räkna antalet "Tidrapporterad"-rader i HELA dokumentet och bekräfta att din "rader"-lista har lika många poster.

EXTRAHERA ENBART arbetstidsdata: datum, klockslag, antal timmar och typ.
Extrahera INTE namn, arbetsplats, uppdragsgivare, ort eller annan metadata.
Anta INGENTING som inte uttryckligen anges i dokumentet. Om rast inte anges, ange 0.

Tidrapporter finns i två format:
**Format A (shifts):** En rad per arbetspass med start- och sluttid.
**Format B (weekly_summary):** En veckosammanfattning i tabellform med tidgrupper (Normaltid, Passiv jour vardag/helg, Aktiv jour, etc.) och timmar per dag.

Identifiera rätt format och extrahera därefter. Om dokumentet visar enskilda pass med klockslag — använd shifts.

**Klockslag som går över midnatt:**
Om ett pass börjar på kvällen och slutar på morgonen efter, ange slut_tid med suffixet "+1", t.ex. "07:15+1". Detta gäller alla nattpass.

**Helgdagar (ar_helgdag=true):**
- Lördagar och söndagar: ALLTID true
- Svenska helgdagar (1 maj, 6 juni, Kristi himmelsfärd, midsommarafton, julafton, juldagen, nyårsafton, nyårsdagen, påsk-/pingstdagen etc.): ALLTID true
- Helgdagar räknas som helg/storhelg även om de infaller på en veckodag

**Passiv vs aktiv jour:**
- "Passiv jour vardag/helg" = tillgänglig via telefon
- "Aktiv jour" / "Vardag 17-21 Aktiv" / "Helg Aktiv" = aktivt arbete under jourtid

**Summering:**
Ange dokumentets EGEN totalsumma både som text (total_tid) och som decimal (total_timmar). Om dokumentet säger "Ni är schemalagd 30,25 timmar v.16" och "Ni är schemalagd 30 timmar v.17", är total_timmar = 60.25.

**Exempel — shifts:**
"21 fredag — Schema kl 21:00 - 07:15 — Tidrapporterad"
→ {"datum":"2023-04-21","veckodag":"fredag","start_tid":"21:00","slut_tid":"07:15+1","typ":"ordinarie","rast_minuter":0,"ar_helgdag":false}

Läs av alla rader noga. Kontrollera att antalet rader matchar antalet "Tidrapporterad"-statusar i hela PDF:en.`;

const SYSTEM_TIDRAPPORT_PASS2 = `Extrahera arbetstidsdata ur den bifogade svenska tidrapporten.

VIKTIGT — FLERSIDIGA DOKUMENT:
Tidrapporter spänner ofta över flera sidor (t.ex. v16 på sida 1, v17 på sida 2). Du måste läsa ALLA sidor och inkludera ALLA arbetspass i utdatan. Hoppa aldrig över en sida.

Var extra noggrann med:
1. **Antal rader** — räkna "Tidrapporterad"-statusar i hela dokumentet och se till att du har lika många pass i "rader"
2. **Nattpass** — om ett pass slutar efter midnatt, ange slut_tid med suffixet "+1" (t.ex. "07:15+1")
3. **Helgdagar (ar_helgdag)** — lördag, söndag och svenska helgdagar = true
4. **Aktiv vs passiv jour** — "Passiv jour" = tillgänglig. "Aktiv" = faktiskt arbete under jourtid
5. **Datum** — använd ÅRTAL från dokumenthuvudet + dag/månad från rader för att bygga YYYY-MM-DD
6. **Totalsumma** — ange total_timmar som decimal (summera alla veckor om flera) och total_tid som text

Extrahera INTE namn, arbetsplats, uppdragsgivare. Anta INGENTING som inte explicit står i dokumentet.`;

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

  // Determine which array to use based on each pass's own format
  const rows1 = (format1 === "weekly_summary"
    ? (pass1.daglig_summering as TidrapportRad[])
    : (pass1.rader as TidrapportRad[])) ?? [];
  const rows2 = (format2 === "weekly_summary"
    ? (pass2.daglig_summering as TidrapportRad[])
    : (pass2.rader as TidrapportRad[])) ?? [];

  // Helper to compute a day's total hours regardless of format
  function dayTotalHours(r: TidrapportRad): number {
    if (typeof r.total_timmar === "number" && r.total_timmar > 0) return r.total_timmar;
    if (typeof r.normaltid_timmar === "number" || typeof r.passiv_jour_timmar === "number" || typeof r.aktiv_jour_timmar === "number") {
      return (r.normaltid_timmar ?? 0) + (r.passiv_jour_timmar ?? 0) + (r.aktiv_jour_timmar ?? 0);
    }
    if (r.start_tid && r.slut_tid) {
      const [sh, sm] = String(r.start_tid).split(":").map(Number);
      const slut = String(r.slut_tid).replace("+1", "");
      const [eh, em] = slut.split(":").map(Number);
      let s = (sh || 0) + (sm || 0) / 60;
      let e = (eh || 0) + (em || 0) / 60;
      if (String(r.slut_tid).includes("+1") || e < s) e += 24;
      return Math.max(0, e - s - ((r.rast_minuter as number) || 0) / 60);
    }
    return 0;
  }

  // Aggregate per-date totals for cross-format comparison
  function aggregateByDate(rows: TidrapportRad[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows) {
      const d = r.datum;
      if (!d) continue;
      m.set(d, (m.get(d) ?? 0) + dayTotalHours(r));
    }
    return m;
  }

  const confidence: ComparisonResult["confidence"] = [];
  const merged: TidrapportRad[] = [];

  if (format1 !== format2) {
    // Cross-format comparison: compare day-totals only
    const agg1 = aggregateByDate(rows1);
    const agg2 = aggregateByDate(rows2);
    const allDates = new Set([...agg1.keys(), ...agg2.keys()]);
    let i = 0;
    for (const d of allDates) {
      const t1 = agg1.get(d) ?? 0;
      const t2 = agg2.get(d) ?? 0;
      const match = Math.abs(t1 - t2) <= 0.5;
      confidence.push({
        index: i++,
        match,
        pass1: { datum: d, total_timmar: t1 },
        pass2: { datum: d, total_timmar: t2 },
      });
    }
    // Use pass1 rows as merged (preserve richer structure)
    merged.push(...rows1);
    const matchCount = confidence.filter((c) => c.match).length;
    const overallConfidence = confidence.length > 0 ? matchCount / confidence.length : 1;
    return { merged, confidence, overallConfidence };
  }

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

    // SECURITY: require authenticated caller; rate-limit AI usage per user.
    const userId = await getAuthUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiRl = await checkAiRateLimit(userId);
    if (!aiRl.allowed) return aiRateLimitResponse(aiRl, corsHeaders);

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    function parseTimeStr(t: string): number {
      const [h, m] = (t ?? "0:0").split(":").map(Number);
      return (h || 0) + (m || 0) / 60;
    }

    // 1. Get review (must be owned by the authenticated user)
    const { data: review, error: reviewErr } = await supabase
      .from("invoice_reviews")
      .select("*")
      .eq("id", review_id)
      .single();
    if (reviewErr || !review) throw new Error("Review not found: " + reviewErr?.message);

    if ((review as any).user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("invoice_reviews").update({ status: "extracting" }).eq("id", review_id);

    // ⚠️ LÅST: Modellen för fakturakontrollen är produktionskritisk.
    // Ändringar i modell, prompt-versioner eller dual-pass-logik kräver
    // EXPLICIT admingodkännande (Anders) innan deploy. Tidigare byte till
    // gemini-3-flash-preview gav instabila resultat — vi har återgått till
    // gemini-2.5-flash som är den senast verifierat stabila versionen.
    const model = "google/gemini-2.5-flash";

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
    function parseDocTotal(summering: any): number | null {
      if (!summering) return null;
      // Prefer parsed decimal field if Gemini provided it
      if (typeof summering.total_timmar === "number" && summering.total_timmar > 0) {
        return summering.total_timmar;
      }
      const raw = (summering.total_tid as string | undefined) ?? "";
      if (!raw) return null;
      // Sum all "Xh Ym" occurrences
      const hmRegex = /(\d+)\s*h\s*(\d+)?\s*m?/gi;
      let total = 0;
      let found = false;
      let m: RegExpExecArray | null;
      while ((m = hmRegex.exec(raw)) !== null) {
        total += parseInt(m[1], 10) + (parseInt(m[2] || "0", 10) / 60);
        found = true;
      }
      if (found) return total;
      // Sum all decimal numbers (handle "30,25 + 30 timmar" or "60.25 h")
      const decRegex = /(\d+(?:[.,]\d+)?)/g;
      let dec = 0;
      let decFound = false;
      while ((m = decRegex.exec(raw)) !== null) {
        const n = parseFloat(m[1].replace(",", "."));
        if (!isNaN(n)) { dec += n; decFound = true; }
      }
      return decFound ? dec : null;
    }

    let summaDiskrepans: { beraknad: number; dokumentet: number } | null = null;
    if (extractedTidrapport) {
      const tr = extractedTidrapport as any;
      const docTotalH = parseDocTotal(tr.summering);
      if (docTotalH !== null && docTotalH > 0) {
        let rowTotal = 0;
        if (tr.format === "weekly_summary" && Array.isArray(tr.daglig_summering)) {
          rowTotal = tr.daglig_summering.reduce(
            (sum: number, d: any) => sum + (d.total_timmar || 0) + (d.total_minuter || 0) / 60,
            0,
          );
        } else if (Array.isArray(tr.rader)) {
          for (const r of tr.rader) {
            const s = parseTimeStr(r.start_tid);
            let e = parseTimeStr((r.slut_tid || "").replace("+1", ""));
            if ((r.slut_tid || "").includes("+1") || e < s) e += 24;
            rowTotal += Math.max(0, e - s - (r.rast_minuter || 0) / 60);
          }
        }
        if (Math.abs(rowTotal - docTotalH) > 0.5) {
          summaDiskrepans = {
            beraknad: Math.round(rowTotal * 100) / 100,
            dokumentet: Math.round(docTotalH * 100) / 100,
          };
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
