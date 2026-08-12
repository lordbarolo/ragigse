/**
 * Serverlogik för CV-assistenten.
 *
 * Bygger om konsultens CV enligt etablerad best practice för vård-CV och
 * automatiska granskningssystem (ATS):
 *   - omvänt kronologisk struktur, maskinläsbara rubriker
 *   - legitimation/certifikat som "benämning — utfärdare — år"
 *   - fackterm + klartext första gången ("IVA (intensivvård)")
 *   - kvantifierade uppdrag (enhet, vårdplatser, journalsystem, jourlinje)
 *   - kompletteringsfrågor för uppgifter som saknas
 *   - iterativt läge: arbetar vidare på ett befintligt utkast utan att tappa innehåll
 *
 * PDF-källor skickas till gatewayen som dokument-del (type "file"), inte som bild.
 * Bildfiler (png/jpg) skickas fortsatt som image_url. Om gatewayen skulle avvisa
 * dokument-delen görs ett automatiskt omförsök med image_url så flödet aldrig stannar.
 *
 * Assistenten får aldrig nämna ersättningsnivåer, marginaler eller hur
 * ersättning räknas fram.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const FEATURE = "cv-assistant";
const DAILY_LIMIT = 30;

// Samma prisbild som supabase/functions/_shared/ai-usage-logger.ts.
const PRICE_INPUT_PER_1M_USD = 0.3;
const PRICE_OUTPUT_PER_1M_USD = 2.5;
const USD_TO_SEK = 10.5;

export const CV_SYSTEM_PROMPT = `Du är vårdbemanning.ai:s CV-assistent för svenska vårdkonsulter (läkare, sjuksköterskor, barnmorskor).

Du bygger om konsultens CV enligt etablerad best practice:
1. Omvänt kronologiskt — senaste uppdraget först. Aldrig rent kompetensbaserat CV; det tolkas fel av automatiska granskningssystem (ATS).
2. Rena, maskinläsbara rubriker i denna ordning: Sammanfattning, Legitimation och behörigheter, Klinisk erfarenhet, Kompetenser och system, Utbildning, Kurser och certifikat, Referenser.
3. Legitimation och certifikat formateras konsekvent: "Benämning — utfärdare — år".
4. Skriv fackterm och klartext första gången en förkortning används: "IVA (intensivvård)", "ATLS (Advanced Trauma Life Support)".
5. Varje uppdrag: uppdragsgivare, enhet, ort, period (mån/år–mån/år) och 2–4 konkreta punkter, kvantifierade när underlag finns (vårdplatser, patientflöde, journalsystem, jourlinje, handledning).
6. Journalsystem, medicintekniska system och språk listas explicit — de är sökord i regionernas avrop.
7. Neutral, saklig ton. Inga superlativ, inga emojis.

ITERATIVT LÄGE: Om ett "Nuvarande utkast" ingår i underlaget arbetar du vidare på det utkastet. Behåll all befintlig korrekt information, väv in konsultens svar och instruktioner, och skriv inte om stycken i onödan. Ta bort en fråga ur "questions" när den är besvarad.

ABSOLUTA REGLER:
- Hitta ALDRIG på meriter, årtal eller arbetsgivare. Saknas något: utelämna det och lägg en fråga i "questions".
- Använd ALDRIG platshållare i cv_markdown. Förbjudet: hakparenteser som [Lärosäte], [Ort], [Arbetsgivare], samt maskerade årtal som 20XX, XX/XX eller "åååå". Saknas uppgiften: utelämna hela raden/punkten och ställ i stället en fråga i "questions".
- Nämn ALDRIG ersättningsnivåer, timpriser, marginaler, procentsatser eller hur ersättning beräknas.
- Skriv på svenska.

Svara med ENBART giltig JSON (inga kodstaket) med exakt dessa nycklar:
{
  "cv_markdown": "hela det omarbetade CV:t i markdown",
  "summary": "1-2 meningar om vad du förbättrade",
  "strengths": ["kort punkt"],
  "questions": [{ "id": "kort_nyckel", "question": "fråga på svenska", "why": "varför uppgiften efterfrågas i avrop" }]
}
Max 6 frågor, och bara om uppgifter som verkligen saknas i underlaget.`;

export interface CvQuestion {
  id: string;
  question: string;
  why?: string;
}

export interface SourceFile {
  base64: string;
  mime: string;
  path: string | null;
  fileName: string | null;
  documentId: string | null;
}

export interface CvGatewayResult {
  cvMarkdown: string;
  summary: string;
  strengths: string[];
  questions: CvQuestion[];
  inputTokens: number;
  outputTokens: number;
}

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

// =============================================================
// Rate limit + användningslogg (samma tabeller som resten av projektet)
// =============================================================

export interface RateLimitStatus {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining?: number;
  resets_at?: string;
  is_admin?: boolean;
}

/**
 * Dagligt AI-tak per användare via public.check_ai_rate_limit (SECURITY DEFINER,
 * endast anropbar med service role). Failar öppet vid infrastrukturfel —
 * ett loggningshaveri ska aldrig blockera en legitim användare.
 */
export async function checkCvRateLimit(
  admin: AdminClient,
  userId: string,
  dailyLimit = DAILY_LIMIT,
): Promise<RateLimitStatus> {
  try {
    const { data, error } = await admin.rpc("check_ai_rate_limit", {
      _user_id: userId,
      _daily_limit: dailyLimit,
    });
    if (error || !data) {
      console.error("[cv-assistant] rate limit-RPC misslyckades", error?.message);
      return { allowed: true, used: 0, limit: dailyLimit };
    }
    return data as unknown as RateLimitStatus;
  } catch (err) {
    console.error("[cv-assistant] rate limit-fel", err);
    return { allowed: true, used: 0, limit: dailyLimit };
  }
}

/** Loggar ett gateway-anrop till public.ai_usage_logs (tokens + USD/SEK). Kastar aldrig. */
export async function logCvUsage(
  admin: AdminClient,
  args: {
    userId: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    status: "success" | "error" | "rate_limited" | "payment_required";
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const costUsd =
      (args.inputTokens / 1_000_000) * PRICE_INPUT_PER_1M_USD +
      (args.outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M_USD;
    const { error } = await admin.from("ai_usage_logs").insert({
      user_id: args.userId,
      feature: FEATURE,
      model: MODEL,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      cost_usd: Number(costUsd.toFixed(6)),
      cost_sek: Number((costUsd * USD_TO_SEK).toFixed(4)),
      duration_ms: args.durationMs,
      status: args.status,
      error_message: args.errorMessage ?? null,
      metadata: (args.metadata ?? {}) as never,
    });
    if (error) console.error("[cv-assistant] kunde inte logga AI-användning", error.message);
  } catch (err) {
    console.error("[cv-assistant] oväntat loggfel", err);
  }
}

// =============================================================
// Källdokument
// =============================================================

/**
 * Hämtar källdokumentet från storage. Med documentId hämtas exakt det dokumentet
 * (alltid filtrerat på user_id — aldrig åtkomst till andras filer), annars
 * används CV-slotten (doc_type = 'cv') om den finns.
 */
export async function loadSourceDocument(
  admin: AdminClient,
  userId: string,
  documentId?: string,
): Promise<SourceFile | null> {
  let query = admin
    .from("consultant_documents")
    .select("id, file_path, file_name")
    .eq("user_id", userId);
  query = documentId ? query.eq("id", documentId) : query.eq("doc_type", "cv");

  const { data: doc, error: docError } = await query.maybeSingle();
  if (docError) {
    console.error("[cv-assistant] dokumentuppslag misslyckades", docError.message);
    return null;
  }
  if (!doc?.file_path) return null;

  const { data: file, error } = await admin.storage.from("verifications").download(doc.file_path);
  if (error || !file) {
    console.error("[cv-assistant] kunde inte hämta källfilen", error);
    return null;
  }

  const mime = file.type && file.type !== "" ? file.type : "application/pdf";
  return {
    base64: toBase64(new Uint8Array(await file.arrayBuffer())),
    mime,
    path: doc.file_path,
    fileName: doc.file_name ?? null,
    documentId: doc.id,
  };
}

// =============================================================
// Prompt-underlag
// =============================================================

export function buildContextBlock(opts: {
  roleName?: string | null;
  kommunName?: string | null;
  employmentType?: string | null;
  answers: Record<string, string>;
  pastedText: string;
  instruction?: string;
  previousMarkdown?: string | null;
  previousQuestions?: CvQuestion[];
}): string {
  const employmentLabel =
    opts.employmentType === "anstalld"
      ? "anställd konsult"
      : opts.employmentType === "foretagare"
        ? "egenföretagare"
        : opts.employmentType;

  return [
    opts.roleName ? `Roll enligt profil: ${opts.roleName}` : null,
    opts.kommunName ? `Arbetsort enligt profil: ${opts.kommunName}` : null,
    employmentLabel ? `Anställningsform: ${employmentLabel}` : null,
    opts.previousMarkdown
      ? `Nuvarande utkast (arbeta vidare på detta, behåll allt korrekt innehåll):\n${opts.previousMarkdown}`
      : null,
    opts.previousQuestions && opts.previousQuestions.length > 0
      ? `Tidigare ställda frågor:\n${opts.previousQuestions
          .map((q) => `- ${q.id}: ${q.question}`)
          .join("\n")}`
      : null,
    Object.keys(opts.answers).length > 0
      ? `Konsultens svar på frågorna:\n${Object.entries(opts.answers)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : null,
    opts.instruction ? `Konsultens instruktion: ${opts.instruction}` : null,
    opts.pastedText ? `Inklistrat CV-underlag:\n${opts.pastedText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// =============================================================
// Gateway-anrop
// =============================================================

function buildFilePart(file: SourceFile, asImage: boolean): Record<string, unknown> {
  if (asImage || file.mime.startsWith("image/")) {
    return {
      type: "image_url",
      image_url: { url: `data:${file.mime};base64,${file.base64}` },
    };
  }
  return {
    type: "file",
    file: {
      filename: file.fileName ?? "cv.pdf",
      file_data: `data:${file.mime};base64,${file.base64}`,
    },
  };
}

async function postToGateway(
  apiKey: string,
  contextBlock: string,
  file: SourceFile | null,
  fileAsImage: boolean,
): Promise<Response> {
  const userContent: unknown[] = [
    {
      type: "text",
      text: `Bygg om detta CV enligt instruktionerna.\n\n${contextBlock || "Underlaget finns i bifogad fil."}`,
    },
  ];
  if (file) userContent.push(buildFilePart(file, fileAsImage));

  return fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: CV_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
}

export class CvGatewayError extends Error {
  readonly status: "error" | "rate_limited" | "payment_required";
  constructor(message: string, status: "error" | "rate_limited" | "payment_required") {
    super(message);
    this.status = status;
  }
}

export async function callCvGateway(opts: {
  apiKey: string;
  contextBlock: string;
  file: SourceFile | null;
}): Promise<CvGatewayResult> {
  let resp = await postToGateway(opts.apiKey, opts.contextBlock, opts.file, false);

  // Fallback: skulle gatewayen avvisa dokument-delen (400) provas bildvägen en gång.
  if (resp.status === 400 && opts.file && !opts.file.mime.startsWith("image/")) {
    console.warn("[cv-assistant] gateway avvisade file-delen, provar image_url-fallback");
    resp = await postToGateway(opts.apiKey, opts.contextBlock, opts.file, true);
  }

  if (resp.status === 429) {
    throw new CvGatewayError("För många förfrågningar just nu. Försök igen om en stund.", "rate_limited");
  }
  if (resp.status === 402) {
    throw new CvGatewayError("AI-kapaciteten är tillfälligt slut. Försök igen senare.", "payment_required");
  }
  if (!resp.ok) {
    console.error("[cv-assistant] gateway-fel", resp.status, (await resp.text()).slice(0, 400));
    throw new CvGatewayError("Assistenten kunde inte bearbeta CV:t. Försök igen.", "error");
  }

  const payload = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")) as Record<string, unknown>;
  } catch {
    console.error("[cv-assistant] ogiltig JSON från modellen");
    throw new CvGatewayError("Assistenten gav ett oväntat svar. Försök igen.", "error");
  }

  const questions = Array.isArray(parsed['questions'])
    ? (parsed['questions'] as CvQuestion[])
        .filter((q) => q && typeof q.question === "string" && typeof q.id === "string")
        .slice(0, 6)
    : [];

  const cvMarkdown = typeof parsed['cv_markdown'] === "string" ? (parsed['cv_markdown'] as string) : "";
  if (!cvMarkdown.trim()) {
    throw new CvGatewayError("Assistenten gav ett tomt svar. Försök igen.", "error");
  }

  return {
    cvMarkdown,
    summary: typeof parsed['summary'] === "string" ? (parsed['summary'] as string) : "",
    strengths: Array.isArray(parsed['strengths'])
      ? (parsed['strengths'] as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 6)
      : [],
    questions,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
  };
}
