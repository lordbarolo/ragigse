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
 *   - faktaspärr: påhittade månader och platshållare tas bort, påhittade årtal och
 *     förkortningar ger ett rättande omtag (se runCvAssistant längst ned)
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
3. Legitimation och certifikat formateras konsekvent: "Benämning — utfärdare — år". Utelämna utfärdare eller år som inte står i underlaget.
4. Skriv fackterm och klartext första gången en förkortning används: "IVA (intensivvård)", "ATLS (Advanced Trauma Life Support)".
5. Varje uppdrag: uppdragsgivare, enhet, ort, period och 1–4 konkreta punkter, kvantifierade när underlag finns (vårdplatser, patientflöde, journalsystem, jourlinje, handledning). Period skrivs mån/år–mån/år när månaderna står i underlaget, annars år–år.
6. Journalsystem, medicintekniska system och språk listas explicit — de är sökord i regionernas avrop.
7. Neutral, saklig ton. Inga superlativ, inga emojis.
8. Rubriknivåer: # enbart för konsultens namn på första raden (när namnet står i underlaget), ## enbart för de sju sektionsrubrikerna i punkt 2, ### för ett enskilt uppdrag eller en utbildning inuti en sektion, till exempel "### Universitetssjukhuset Örebro, Intensivvårdsavdelningen, Örebro". Skriv aldrig en arbetsgivare, enhet eller utbildning som ##.

ITERATIVT LÄGE: Om ett "Nuvarande utkast" ingår i underlaget arbetar du vidare på det utkastet. Behåll all befintlig korrekt information, väv in konsultens svar och instruktioner, och skriv inte om stycken i onödan. Ta bort en fråga ur "questions" när den är besvarad.

ABSOLUTA REGLER:
- Hitta ALDRIG på meriter, årtal eller arbetsgivare. Saknas något: utelämna det och lägg en fråga i "questions".
- Allt i cv_markdown ska gå att härleda ur underlaget, konsultens svar eller instruktion. Du får omformulera och strukturera, men aldrig lägga till:
  • månader när underlaget bara anger år (skriv "2019–" och inte "09/2019–"),
  • utfärdare som inte står i underlaget (en specialistsjuksköterskeexamen utfärdas av lärosätet, inte av Socialstyrelsen),
  • kurser, certifikat eller varianter av dem (står det "HLR" skriver du inte "S-HLR", "A-HLR" eller ett årtal),
  • språknivåer som inte anges (står det "talar svenska och engelska" skriver du just det),
  • arbetsuppgifter, ansvar, system, metoder eller patientgrupper som inte nämns.
- Använd ALDRIG platshållare i cv_markdown. Förbjudet: hakparenteser som [Lärosäte], [Ort], [Arbetsgivare], maskerade årtal som 20XX, XX/XX eller "åååå", samt ord som "saknas", "okänt" eller "ej angivet". Saknas uppgiften: utelämna raden, punkten eller den delen av raden och ställ i stället en fråga i "questions".
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
  /** Modellens råa svar, används som föregående tur vid rättande omtag. */
  rawContent: string;
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

interface CvFollowUp {
  assistantContent: string;
  feedback: string;
}

async function postToGateway(
  apiKey: string,
  contextBlock: string,
  file: SourceFile | null,
  fileAsImage: boolean,
  followUp?: CvFollowUp,
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
        ...(followUp
          ? [
              { role: "assistant", content: followUp.assistantContent },
              { role: "user", content: followUp.feedback },
            ]
          : []),
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
  followUp?: CvFollowUp;
}): Promise<CvGatewayResult> {
  let resp = await postToGateway(opts.apiKey, opts.contextBlock, opts.file, false, opts.followUp);

  // Fallback: skulle gatewayen avvisa dokument-delen (400) provas bildvägen en gång.
  if (resp.status === 400 && opts.file && !opts.file.mime.startsWith("image/")) {
    console.warn("[cv-assistant] gateway avvisade file-delen, provar image_url-fallback");
    resp = await postToGateway(opts.apiKey, opts.contextBlock, opts.file, true, opts.followUp);
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
    rawContent: raw,
  };
}

// =============================================================
// Faktaspärr
// =============================================================
//
// Prompten räcker inte ensam: modellen fyller gärna i månader, utfärdare, kursvarianter
// och årtal som låter rimliga men inte står i underlaget. Spärren jämför utkastet mot
// underlaget (inklistrad text, föregående utkast, konsultens svar och instruktion):
//   - månader som inte finns i underlaget tas bort ("09/2019" → "2019"),
//   - platshållare ("Period saknas", "[Ort]", "20XX") tas bort,
//   - årtal och förkortningar som inte finns i underlaget leder till ett rättande
//     omtag där modellen får listan och ombeds ta bort dem.
// Utan textunderlag (uppladdad fil vid första körningen) görs bara platshållarstädningen.

export interface CvGuardReport {
  /** Årtal i utkastet som inte finns i underlaget. */
  inventedYears: string[];
  /** Förkortningar (t.ex. "S-HLR") som inte finns i underlaget. */
  inventedAcronyms: string[];
  /** Antal månader som togs bort eftersom underlaget bara angav år. */
  removedMonths: number;
  /** Antal platshållare som togs bort. */
  removedPlaceholders: number;
}

const MONTH_NUMBERS: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, mars: 3,
  apr: 4, april: 4,
  maj: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  aug: 8, augusti: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const YEAR_RE = /(?<!\d)(?:19|20)\d{2}(?!\d)/g;
const NUMERIC_MONTH_RE = /(?<!\d)(0?[1-9]|1[0-2])\s*[./]\s*((?:19|20)\d{2})(?!\d)/g;
const NAMED_MONTH_RE = /(?<!\p{L})(\p{L}{3,9})\.?\s+((?:19|20)\d{2})(?!\d)/gu;
const ACRONYM_RE = /(?<![\p{L}\p{N}-])[A-ZÅÄÖ0-9]+(?:-[A-ZÅÄÖ0-9]+)*(?![\p{L}\p{N}-])/gu;
const PLACEHOLDER_WORD_RE = /(?<!\p{L})(?:saknas|okänt|okänd|ej angivet|ej angiven|anges senare)(?!\p{L})/iu;
// Ett led räknas som platshållare bara om platshållarordet avslutar ett kort led
// ("Period saknas", "Okänt") – aldrig mitt i en klinisk fras ("feber av okänd genes").
const PLACEHOLDER_SEGMENT_RE = /^(?:\p{L}+\s+){0,2}(?:saknas|okänt|okänd|ej angivet|ej angiven|anges senare)[.:]?$/iu;
const BRACKET_PLACEHOLDER_RE = /\[[^\]\n]{1,40}\](?!\()/g;
const MASKED_YEAR_RE = /(?<![\p{L}\p{N}])(?:(?:19|20)XX|XX\/XX(?:XX)?|åååå)(?![\p{L}\p{N}])/giu;

/** Ord som får stå versalt utan att räknas som förkortningar (rubriker, CV, ATS). */
const ACRONYM_ALLOWLIST = new Set([
  "cv", "ats", "sammanfattning", "legitimation", "och", "behörigheter", "klinisk", "erfarenhet",
  "kompetenser", "system", "utbildning", "kurser", "certifikat", "referenser",
]);

function monthYearPairs(text: string): Set<string> {
  const pairs = new Set<string>();
  for (const m of text.matchAll(NUMERIC_MONTH_RE)) pairs.add(`${m[2]}-${Number(m[1])}`);
  for (const m of text.matchAll(NAMED_MONTH_RE)) {
    const month = MONTH_NUMBERS[(m[1] ?? "").toLowerCase()];
    if (month) pairs.add(`${m[2]}-${month}`);
  }
  return pairs;
}

function stripInventedMonths(markdown: string, corpusPairs: Set<string>): { text: string; removed: number } {
  let removed = 0;
  let text = markdown.replace(NUMERIC_MONTH_RE, (match, month: string, year: string) => {
    if (corpusPairs.has(`${year}-${Number(month)}`)) return match;
    removed++;
    return year;
  });
  text = text.replace(NAMED_MONTH_RE, (match, word: string, year: string) => {
    const month = MONTH_NUMBERS[word.toLowerCase()];
    if (!month || corpusPairs.has(`${year}-${month}`)) return match;
    removed++;
    return year;
  });
  return { text, removed };
}

function stripPlaceholders(markdown: string): { text: string; removed: number } {
  let removed = 0;
  const lines: string[] = [];
  for (const rawLine of markdown.split("\n")) {
    let removedHere = 0;
    let line = rawLine
      .replace(BRACKET_PLACEHOLDER_RE, () => {
        removedHere++;
        return "";
      })
      .replace(MASKED_YEAR_RE, () => {
        removedHere++;
        return "";
      });

    if (removedHere > 0 || line.split(/\s*(?:\||—|–|·)\s*/).some((seg) => PLACEHOLDER_SEGMENT_RE.test(seg.replace(/^[\s>#*+-]+/, "").trim()))) {
      // Ta bara bort de led i raden som är platshållare eller blev tomma
      // ("Sjuksköterska | Period saknas" → "Sjuksköterska", "Program — [Lärosäte] — 2010" → "Program — 2010").
      // Listmarkör/rubriktecken och avslutande hård radbrytning bevaras.
      const prefix = line.match(/^\s*(?:[*-]\s+|#{1,6}\s+|>\s*)?/)?.[0] ?? "";
      const hardBreak = / {2,}$/.test(line) ? "  " : "";
      // Separatorn fångas utan omgivande blanksteg så att "— —" delas som två separatorer.
      const parts = line.slice(prefix.length).split(/((?<=\s)[|—–](?=\s)|,(?=\s))/);
      const kept: string[] = [];
      for (let i = 0; i < parts.length; i += 2) {
        const text = (parts[i] ?? "").trim();
        if (text === "") continue;
        if (PLACEHOLDER_SEGMENT_RE.test(text)) {
          removedHere++;
          continue;
        }
        const sep = parts[i - 1];
        if (kept.length > 0) kept.push(sep === "," ? ", " : ` ${sep ?? "—"} `);
        kept.push(text);
      }
      let body = kept.join("").replace(/ {2,}/g, " ").replace(/\(\s*\)/g, "").trim();
      // Låg platshållaren inuti **fetstil** får markeringen inte bli obalanserad.
      if ((body.match(/\*\*/g) ?? []).length % 2 === 1) {
        body = body.startsWith("**") ? `${body}**` : `**${body}`;
      }
      line = body === "" ? "" : `${prefix}${body}${hardBreak}`;
    }

    removed += removedHere;
    if (removedHere > 0 && line.replace(/[*_#>\s|—–,.:-]/g, "").length === 0) continue;
    lines.push(line);
  }
  return { text: lines.join("\n"), removed };
}

/** Städar utkastet och rapporterar uppgifter som inte går att härleda ur underlaget. */
export function applyFactGuard(
  markdown: string,
  corpus: string | null,
): { markdown: string; report: CvGuardReport } {
  const placeholders = stripPlaceholders(markdown);
  let text = placeholders.text;
  const report: CvGuardReport = {
    inventedYears: [],
    inventedAcronyms: [],
    removedMonths: 0,
    removedPlaceholders: placeholders.removed,
  };
  if (corpus === null) return { markdown: text, report };

  const months = stripInventedMonths(text, monthYearPairs(corpus));
  text = months.text;
  report.removedMonths = months.removed;

  const corpusYears = new Set(corpus.match(YEAR_RE) ?? []);
  report.inventedYears = [...new Set(text.match(YEAR_RE) ?? [])].filter((y) => !corpusYears.has(y));

  const corpusLower = corpus.toLowerCase();
  report.inventedAcronyms = [
    ...new Set(
      [...text.matchAll(ACRONYM_RE)]
        .map((m) => m[0])
        .filter((t) => (t.match(/[A-ZÅÄÖ]/g) ?? []).length >= 2 && t.length <= 12)
        .filter((t) => !ACRONYM_ALLOWLIST.has(t.toLowerCase()))
        .filter((t) => !corpusLower.includes(t.toLowerCase())),
    ),
  ];

  return { markdown: text, report };
}

function guardFeedback(report: CvGuardReport): string {
  const items = [
    ...report.inventedYears.map((y) => `årtalet ${y}`),
    ...report.inventedAcronyms.map((a) => `"${a}"`),
  ];
  return (
    `Granskning av ditt svar: följande finns inte i underlaget, konsultens svar eller instruktion ` +
    `och får inte stå i cv_markdown: ${items.join(", ")}. Ta bort dem. Behövs uppgiften, ställ en ` +
    `fråga i "questions" i stället. Lägg inte till något annat som inte står i underlaget. ` +
    `Svara med hela JSON-objektet igen.`
  );
}

/**
 * Kör assistenten med faktaspärr. Ger spärren utslag görs ett rättande omtag; misslyckas
 * omtaget används det städade första svaret. Tokens summeras så att en användaråtgärd
 * loggas som ett anrop.
 */
export async function runCvAssistant(opts: {
  apiKey: string;
  contextBlock: string;
  file: SourceFile | null;
  corpus: string | null;
}): Promise<CvGatewayResult & { guard: CvGuardReport; retried: boolean }> {
  const first = await callCvGateway({ apiKey: opts.apiKey, contextBlock: opts.contextBlock, file: opts.file });
  const checked = applyFactGuard(first.cvMarkdown, opts.corpus);
  const needsRetry = checked.report.inventedYears.length > 0 || checked.report.inventedAcronyms.length > 0;
  if (!needsRetry) {
    return { ...first, cvMarkdown: checked.markdown, guard: checked.report, retried: false };
  }

  try {
    const second = await callCvGateway({
      apiKey: opts.apiKey,
      contextBlock: opts.contextBlock,
      file: opts.file,
      followUp: { assistantContent: first.rawContent, feedback: guardFeedback(checked.report) },
    });
    const rechecked = applyFactGuard(second.cvMarkdown, opts.corpus);
    return {
      ...second,
      cvMarkdown: rechecked.markdown,
      inputTokens: first.inputTokens + second.inputTokens,
      outputTokens: first.outputTokens + second.outputTokens,
      guard: rechecked.report,
      retried: true,
    };
  } catch (err) {
    console.error("[cv-assistant] rättande omtag misslyckades, använder städat första svar", err);
    return { ...first, cvMarkdown: checked.markdown, guard: checked.report, retried: false };
  }
}
