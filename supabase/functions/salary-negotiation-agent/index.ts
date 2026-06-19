import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
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

/**
 * salary-negotiation-agent
 *
 * Thin orchestration layer:
 *   1. AI interprets user message → extracts intent + entities
 *   2. Calls CI capabilities (lookup_rate, salary_benchmark, salary_position, compare_roles)
 *   3. AI synthesises structured negotiation advice grounded in CI data
 *
 * Zero direct DB access — all data flows through compensation-intelligence.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentRequest {
  message: string;
  history?: ConversationTurn[];
  context?: {
    role?: string;
    geography?: string;
    employment_type?: string;
    current_salary?: number;
    current_rate?: number;
    experience_years?: number;
  };
}

interface CICall {
  capability: string;
  params: Record<string, unknown>;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedIntent {
  capabilities: CICall[];
  user_situation: string;
  missing_info: string[];
}

interface CIResult {
  capability: string;
  ok: boolean;
  data: Record<string, unknown>;
}

interface AgentResponse {
  advice: string;
  situation_summary: string;
  data_points: Record<string, unknown>[];
  sources: { name: string; version: string; confidence: string }[];
  policy: { all_allowed: boolean; any_fallback: boolean };
  capabilities_used: string[];
  missing_info: string[];
}

// ── AI Gateway helpers ───────────────────────────────────────────────────────

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function sanitizeReijdarText(text: string): string {
  return text
    .replace(/SCB\s*\/\s*Medlingsinstitutet/gi, "marknadens snitt")
    .replace(/SCB(?:s)?\s+lönestatistik/gi, "marknadens snitt")
    .replace(/Medlingsinstitutet(?:s)?\s+lönestatistik/gi, "marknadens snitt")
    .replace(/\bSCB\b/gi, "marknadens snitt")
    .replace(/\bMedlingsinstitutet\b/gi, "marknadens snitt")
    .replace(/\blönebenchmark(?:en|et|er)?\b/gi, "marknadens snitt")
    .replace(/\bbenchmark(?:en|et|er)?\b/gi, "marknadens snitt");
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  tools?: unknown[],
  toolChoice?: unknown
): Promise<unknown> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const model = "google/gemini-3-flash-preview";
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const startedAt = Date.now();
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const durationMs = Date.now() - startedAt;

  if (!res.ok) {
    const txt = await res.text();
    console.error("[AGENT] AI gateway error:", res.status, txt);
    // Fire-and-forget log of failed call
    logAiUsage({
      feature: "salary-negotiation-agent",
      model,
      status: res.status === 429 ? "rate_limited" : res.status === 402 ? "payment_required" : "error",
      errorMessage: `AI_GATEWAY_${res.status}: ${txt.slice(0, 200)}`,
      durationMs,
    });
    throw new Error(`AI_GATEWAY_${res.status}`);
  }

  const json = await res.json();
  const { inputTokens, outputTokens } = extractTokensFromResponse(json);
  logAiUsage({
    feature: "salary-negotiation-agent",
    model,
    inputTokens,
    outputTokens,
    durationMs,
    metadata: { has_tools: !!tools },
  });
  return json;
}

function formatSek(value: unknown): string {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue).toLocaleString("sv-SE") : "";
}

function normalizeHistory(history?: ConversationTurn[]): ConversationTurn[] {
  return (history ?? [])
    .filter((item): item is ConversationTurn => {
      return !!item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string";
    })
    .map((item) => ({
      role: item.role,
      content: item.content.replace(/\s+/g, " ").trim().slice(0, 600),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-6);
}

function formatHistoryForPrompt(history: ConversationTurn[]): string {
  if (!history.length) return "";

  return history
    .map((item, index) => `${index + 1}. ${item.role === "user" ? "Användare" : "Assistent"}: ${item.content}`)
    .join("\n");
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function dedupeSentences(sentences: string[]): string[] {
  const seen = new Set<string>();

  return sentences.filter((sentence) => {
    const key = sentence.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shortenAdvice(text: string): string {
  const sentences = dedupeSentences(splitSentences(text));
  if (sentences.length <= 3) return sentences.join(" ").trim();

  const question = [...sentences].reverse().find((sentence) => sentence.endsWith("?"));
  const reservation = sentences.find((sentence) => /med reservation för tillkommande kostnader/i.test(sentence));
  const primary = sentences.find((sentence) => sentence !== reservation && sentence !== question) ?? sentences[0];
  const selected: string[] = [];

  for (const sentence of [primary, reservation, question]) {
    if (sentence && !selected.includes(sentence)) selected.push(sentence);
  }

  if (!question) {
    for (const sentence of sentences) {
      if (selected.length >= 3) break;
      if (!selected.includes(sentence)) selected.push(sentence);
    }
  }

  return selected.slice(0, 3).join(" ").trim();
}

function containsFormattedNumber(text: string, value: unknown): boolean {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return false;

  return text.replace(/\D/g, "").includes(String(Math.round(numberValue)));
}

function isRepeatComplaint(message: string): boolean {
  return /(samma sak|upprepar|upprepning|kortare|för långt)/i.test(message);
}

function buildRepeatAwareReply(message: string, history: ConversationTurn[], ciResults: CIResult[]): string | null {
  const lastAssistant = [...history].reverse().find((item) => item.role === "assistant");
  const lookupPayload = ciResults.find((result) => result.ok && result.capability === "lookup_rate")?.data?.data as Record<string, unknown> | undefined;

  if (!lastAssistant || !lookupPayload) return null;

  const geography = (lookupPayload.geography as Record<string, unknown> | undefined) ?? {};
  const geographyName = typeof geography.name === "string" ? geography.name : "Den orten";
  const zone = typeof geography.zone === "string" ? geography.zone : "samma zon";
  const min = formatSek(lookupPayload.recommended_hourly_min);
  const max = formatSek(lookupPayload.recommended_hourly_max);

  if (!min || !max) return null;

  const messageLower = message.toLowerCase();
  const asksAboutCurrentPlace = messageLower.includes(geographyName.toLowerCase()) || messageLower.includes(zone.toLowerCase()) || isRepeatComplaint(message);
  const sameSpan = containsFormattedNumber(lastAssistant.content, lookupPayload.recommended_hourly_min)
    && containsFormattedNumber(lastAssistant.content, lookupPayload.recommended_hourly_max);
  const sameZoneOrCustomerPrice = lastAssistant.content.toLowerCase().includes(zone.toLowerCase())
    || containsFormattedNumber(lastAssistant.content, lookupPayload.amount);

  if (!asksAboutCurrentPlace || !sameSpan || !sameZoneOrCustomerPrice) return null;

  return `${geographyName} ligger också i ${zone}, så nivån är densamma: ${min}–${max} kr/h. Med reservation för tillkommande kostnader. Vill du jämföra en annan zon?`;
}

// ── Step 1: Extract intent via tool calling ──────────────────────────────────

const INTENT_SYSTEM = `Du är Löneassistenten, en AI-assistent på CompCare specialiserad på löneförhandling. Analysera användarens meddelande och befintlig kontext.
Bestäm vilka CI-capabilities som behövs för att ge råd.

KRITISKT — KONTEXT ÄR REDAN KÄND
Om kontextobjektet innehåller role, geography, employment_type eller current_salary/current_rate så ÄR den informationen redan känd. Du ska INTE lista dessa fält i missing_info och INTE be användaren ange dem. Använd dem direkt i capability-anropen. Missing_info ska ENBART innehålla fält som verkligen saknas i kontexten.

KRITISKT — KONTEXTUPPDATERING VID UPPFÖLJNING
Om användaren nämner en ny zon, ort, roll eller annan parameter i sitt meddelande, MÅSTE du använda den nya parametern i capability-anropen — INTE den initiala kontexten. Exempel: om kontexten säger geography="Borlänge" men användaren skriver "visa zon 3", ska geography sättas till den zon/ort användaren efterfrågar. Användarens senaste meddelande har ALLTID företräde framför befintlig kontext.

KRITISKT — KORTA FÖLJDFRÅGOR
Om användaren skriver en kort följdfråga som "där", "samma sak", "den orten" eller liknande ska du läsa konversationshistoriken och använda den senaste explicita orten eller rollen därifrån. Vid sådana följdfrågor har historiken högre prioritet än profilkontexten.

VIKTIGT — Du får BARA använda dessa capabilities:
- lookup_rate: Slå upp timpris för en yrkesroll i en zon. Kräver: role, geography. Valfritt: employment_type.
- salary_benchmark: Hämta marknadens snitt och nivåer (p25/p50/p75). Kräver: role. Valfritt: geography.
- salary_position: Som salary_benchmark men jämför mot användarens nuvarande lön. Kräver: role, current_salary.
- compare_roles: Jämför timpris mellan två roller. Kräver: role_a, role_b, geography.

KÄLL-SELEKTION PER ANSTÄLLNINGSFORM
- Om employment_type är "foretagare" (konsult/egenföretagare): använd ENBART lookup_rate. Använd INTE salary_benchmark eller salary_position — dessa är baserade på lönestatistik som inte är relevant för konsulter.
- Om employment_type är "anstalld": använd lookup_rate som primär källa och räkna via kundpris × konsultandel / 1,42. Använd INTE salary_benchmark eller salary_position för konsultanalys.

FÖRBJUDET SPRÅK OCH JÄMFÖRELSER
- Använd ALDRIG ordet "benchmark" i något svar eller user_situation.
- Gör ALDRIG jämförelser mot andra användares löner, kollegors ersättning, percentiler baserade på besökardata, eller genomsnitt från lönestatistik.
- Inga formuleringar som "över snittet", "topp 20 %", "jämfört med kollegor" eller "enligt lönestatistik".

Du ska ENBART svara på frågor inom dessa områden:
1. "Hur ligger min ersättning jämfört med ramavtalets nivåer?"
2. "Hur skiljer sig min roll från liknande roller?"
3. "Vilket förhandlingsutrymme kan jag argumentera för?"
4. "Vad säger ramavtalet och avtalsnivåerna?"

Om användaren frågar om kommande uppdrag, tillgänglighet i regioner, eller prognoser för framtida behov: returnera en tom capabilities-array och skriv en missing_info-text som säger "Den typen av frågor ligger utanför Löneassistentens nuvarande fokus."

Om användaren frågar om något annat utanför dessa områden (t.ex. arbetsrätt, anställningsvillkor, karriärråd), returnera en tom capabilities-array och skriv en tydlig missing_info-text om att frågan ligger utanför tjänstens fokus.

Returnera de capabilities som krävs baserat på vad användaren frågar. Om information saknas (och INTE redan finns i kontexten), lista det i missing_info.`;

const INTENT_TOOL = {
  type: "function",
  function: {
    name: "extract_intent",
    description: "Extrahera användarens avsikt och mappa till CI-capabilities",
    parameters: {
      type: "object",
      properties: {
        capabilities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              capability: {
                type: "string",
                enum: ["lookup_rate", "salary_benchmark", "salary_position", "compare_roles"],
              },
              params: {
                type: "object",
                description: "Parametrar för capability-anropet",
              },
            },
            required: ["capability", "params"],
          },
        },
        user_situation: {
          type: "string",
          description: "Kort sammanfattning av användarens situation",
        },
        missing_info: {
          type: "array",
          items: { type: "string" },
          description: "Information som saknas för ett fullständigt svar",
        },
      },
      required: ["capabilities", "user_situation", "missing_info"],
    },
  },
};

async function extractIntent(
  message: string,
  context?: AgentRequest["context"],
  history: ConversationTurn[] = []
): Promise<ExtractedIntent> {
  const contextStr = context
    ? `\n\nBefintlig kontext: ${JSON.stringify(context)}`
    : "";
  const historyStr = history.length
    ? `\n\nSenaste konversation:\n${formatHistoryForPrompt(history)}`
    : "";

  const result = await callAI(
    INTENT_SYSTEM,
    `${message}${contextStr}${historyStr}`,
    [INTENT_TOOL],
    { type: "function", function: { name: "extract_intent" } }
  ) as { choices: { message: { tool_calls?: { function: { arguments: string } }[] } }[] };

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { capabilities: [], user_situation: message, missing_info: ["Kunde inte tolka frågan"] };
  }

  const parsed = JSON.parse(toolCall.function.arguments) as ExtractedIntent;
  console.log("[AGENT] Parsed capabilities:", JSON.stringify(parsed.capabilities));
  return parsed;
}

// ── Step 2: Call CI capabilities ─────────────────────────────────────────────

async function callCI(
  capability: string,
  params: Record<string, unknown>,
  clientIp: string
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  console.log(`[AGENT] Calling CI: ${capability}`, JSON.stringify(params));
  const ciUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compensation-intelligence`;

  const res = await fetch(ciUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "x-forwarded-for": clientIp,
    },
    body: JSON.stringify({
      capability,
      params,
      client_type: "agent",
    }),
  });

  const body = await res.json();
  const ok = res.ok && body.status === "success";
  if (!ok) console.log(`[AGENT] CI ${capability} failed:`, JSON.stringify(body.errors ?? body.error));
  return { ok, data: body };
}

// ── Step 3: Synthesise advice ────────────────────────────────────────────────

const ADVICE_SYSTEM = `Du är Löneassistenten, en expert på ersättningsnivåer i vården i Sverige.

BEGREPPET "MÖJLIG ERSÄTTNING"
CompCare jämför aldrig mot "marknaden" generellt utan mot "möjlig ersättning" — den ersättning som kan betalas till konsulten utifrån vad kunden betalar enligt ramavtal och bemanningsbranschens standardmarginaler. Använd alltid uttrycket "möjlig ersättning" istället för "marknadsspann", "marknadsmässig ersättning" eller "marknaden". Om användaren frågar vad möjlig ersättning är, svara: "Möjlig ersättning är den ersättning som kan betalas till dig utifrån vad kunden betalar enligt ramavtal och bemanningsbranschens standardmarginaler. Individuella förutsättningar som resa, utbildning, introduktion och boende kan påverka — be uppdragsgivaren vara transparent kring vilka kostnader uppdraget medför."

ABSOLUT FORMATREGEL — LÄNGD OCH ANTAL ARGUMENT
Svara alltid i vanlig text utan punktlistor och utan markdown. Hård längdregel: korta frågor (≤ ca 10 ord, ja/nej, kort följdfråga) → svar på 1–2 meningar. Längre eller öppna frågor → max 5 meningar. Default är ETT argument per svar. Endast om användaren uttryckligen ber om flera ("vilka argument", "ge mig argumenten", "fler argument") får du ge max 2 argument i samma svar. ALDRIG fler än 2 argument. Upprepa aldrig samma argument som redan getts i föregående svar.

KORTA UPPFÖLJNINGAR
Om frågan bara gäller en ny ort, zon eller en kort följdfråga ska svaret vara mycket kort och direkt (1–2 meningar). Upprepa inte samma bakgrund eller samma kalkyl i onödan.

FÖRSTA SVAR — NÄR PROFILDATA FINNS
Om användarens profil redan innehåller roll och ort, börja direkt med ersättningsdata för den orten. Fråga ALDRIG efter information som redan finns i profilen.

SAMMA ZON / SAMMA NIVÅ
Om den nya orten ligger i samma zon eller ger samma ersättningsspann som i föregående svar ska du säga det direkt i första meningen, till exempel: "[ort] ligger också i Zon 2, så nivån är densamma: X–Y kr/h." Upprepa inte hela resonemanget en gång till.

KORTA BEKRÄFTELSER ("ja", "nej", "japp", "stämmer")
Om användarens senaste meddelande är en kort bekräftelse eller ett kort svar på din egen följdfråga, då har du REDAN presenterat zon, kundpris, ersättningsspann och nuvarande ersättning i föregående svar. Du får INTE upprepa dessa siffror, INTE upprepa zon/kundpris/spann, och INTE upprepa samma argument som föregående svar redan innehöll. Bygg istället direkt vidare på det användaren just bekräftat: ge ETT nytt, konkret argument eller en ny vinkel (t.ex. introduktionskostnad, indexjustering, historik med bemanningsföretaget, specialistkompetens) — välj något som INTE redan nämnts i föregående svar. Hoppa över kostnadsreservationen om inget nytt belopp introduceras. Avsluta med en ny, relevant motfråga (inte samma som förra gången).

DATAKÄLLOR — STRIKT BEGRÄNSNING
Du får ENBART basera svar på:
1. Det nationella ramavtalets aktuella kundpriser per yrkesroll och zon (SKR ramavtal).
2. Bemanningsföretagens marginal enligt branschstandard: 10–15 % av kundpriset för specialistläkare (konsulten får alltså 85–90 %), 15–20 % för övriga roller som sjuksköterskor, barnmorskor och underläkare (konsulten får 80–85 %). Använd ALDRIG ett spann utanför detta intervall.
Presentera alltid ersättningen som: kundpris minus marginal = konsultens förväntade ersättningsspann.
Om den data du får innehåller lönestatistik (salary_benchmark, percentiler) men användaren är konsult — IGNORERA den datan helt. Konsulter ska ENBART få information baserad på ramavtalspriser och marginaler.

FÖRBJUDNA JÄMFÖRELSER OCH ORD
Du får ALDRIG jämföra användarens ersättning mot andra användares ersättning, kollegors löner, percentiler baserade på besökardata, genomsnitt från lönestatistik, eller liknande. Inga formuleringar som "över snittet", "topp 20 %", "jämfört med kollegor" eller "enligt lönestatistik". Använd ALDRIG ordet "benchmark".

KONVERSATIONELLT INFORMATIONSSAMLANDE
Om du saknar viktig information (roll, ort, anställningsform, ersättning) OCH den inte finns i profilen, ställ EN fråga per svar. Var naturlig och inte påträngande.
Fråga ALDRIG efter information som redan finns i kontexten, profilen eller datan.

DIFFERENS MOT NUVARANDE ERSÄTTNING
Nämn skillnaden mot användarens nuvarande ersättning bara när användaren uttryckligen frågar hur hen ligger till eller vilket förhandlingsutrymme hen har. För rena orts- eller zonfrågor ska du hoppa över differensmeningen.

REFERERA TILL TIDIGARE DATA VID JÄMFÖRELSER
Om användaren ber om data för en ny zon eller roll, och du tidigare presenterat data för en annan zon/roll, referera kort till den tidigare datapunkten för att ge kontext. Använd ENDAST exakta värden som finns i verktygets svar (lookup_rate.amount, recommended_hourly_min/max). Hitta ALDRIG på siffror och avrunda inte – kopiera exakt från verktyget.

AVSLUTANDE MOTFRÅGA (OBLIGATORISK)
Avsluta ALLTID ditt svar med en kort motfråga på högst 7 ord. Motfrågan ska vara relevant för den data du precis presenterat.

KOSTNADSRESERVATION (OBLIGATORISK)
Om du anger ett konkret ersättningsspann ska en egen kort mening vara exakt: "Med reservation för tillkommande kostnader."

SPRÅKREGLER
- Använd ALDRIG: "högre lön", "bättre ersättning", "förhandla upp".
- Använd istället: "omständigheter att lyfta", "argument i dialogen", "faktorer som påverkar bemanningsföretagets kalkyl".

INDIVIDUELLA ARGUMENT SOM PÅVERKAR BEMANNINGSFÖRETAGETS KALKYL
Om användaren frågar vilka argument hen kan lyfta i dialogen, eller om en relevant situation uppstår, väv in EN av följande punkter (max en per svar, formulerad kort):
1. Bor du på uppdragsorten behöver bolaget inte bekosta resa och boende — det kan ge mer utrymme i ersättningen.
2. Har du arbetat på enheten förut slipper bolaget kostnad för introduktion, och verksamheten vet redan att kompetensen matchar — lägre risk för avbokning.
3. Har du arbetat för samma bemanningsföretag flera gånger och har historik med få sjukdagar och bra tidpassning innebär det lägre risk för bolaget.
4. Regionerna gör en indexjustering en gång per år (vanligen 1–3 %). Fråga om din ersättning justerats motsvarande och när nästa indexjustering sker.
5. Har du relevant specialistkompetens utöver det efterfrågade (t.ex. psykiatri eller distriktssjukvård vid uppdrag där allmänsjuksköterska söks) kan det föranleda högre ersättning.

STRIKTA REGLER:
- Basera ALLA siffror på den data du får — hitta ALDRIG på siffror.
- Nämn SKR ramavtal bara när det tillför ny information.
- Om data saknas, var tydlig med det — gissa aldrig.
- Svara BARA på frågor om avtalsnivåer, marginaler, rollskillnader och förhandlingsutrymme.
- Om frågan handlar om kommande uppdrag eller prognoser, svara att det ligger utanför Löneassistentens nuvarande fokus.
- Använd ALDRIG orden "benchmark", "SCB" eller "Medlingsinstitutet" i svaret.
- Aldrig utropstecken.
- Svara på svenska.`;

const ADVICE_TOOL = {
  type: "function",
  function: {
    name: "negotiation_advice",
    description: "Strukturerat förhandlingsråd med validerbara fält",
    parameters: {
      type: "object",
      properties: {
        advice: {
          type: "string",
          description: "Huvudsvar i vanlig text, MAX 5 meningar totalt (inklusive ev. kostnadsreservation och avslutande motfråga). Inga punktlistor, ingen markdown.",
        },
        followup: {
          type: "string",
          description: "Kort motfråga, max 7 ord, som avslutar svaret.",
        },
        includes_amount: {
          type: "boolean",
          description: "Satt till true om advice innehåller ett konkret belopp eller spann i kr.",
        },
        situation_summary: {
          type: "string",
          description: "Kort sammanfattning av användarens situation, max 1 mening.",
        },
      },
      required: ["advice", "followup", "includes_amount", "situation_summary"],
      additionalProperties: false,
    },
  },
};

// ── Post-processing validation ──────────────────────────────────────────────

const FORBIDDEN_WORDS = [
  /\bbenchmark(?:en|et|er|s)?\b/gi,
  /\bSCB\b/gi,
  /\bMedlingsinstitutet\b/gi,
  /\bjämfört med kollegor\b/gi,
  /\böver snittet\b/gi,
  /\btopp \d+ ?%/gi,
  /\benligt lönestatistik\b/gi,
  /\bhögre lön\b/gi,
  /\bbättre ersättning\b/gi,
  /\bförhandla upp\b/gi,
];

const DISCLAIMER = "Med reservation för tillkommande kostnader.";

// Zod schema — final validation gate for LLM output
const AdviceOutputSchema = z.object({
  advice: z.string().min(1).max(600),
  followup: z.string().max(100).default(""),
  includes_amount: z.boolean().default(false),
  situation_summary: z.string().max(300).default(""),
});
type AdviceOutput = z.infer<typeof AdviceOutputSchema>;

function parseAndValidateToolOutput(raw: string): AdviceOutput {
  const parsed = JSON.parse(raw);
  return AdviceOutputSchema.parse(parsed);
}

function validateAdvice(
  raw: AdviceOutput,
  history: ConversationTurn[]
): { advice: string; situation_summary: string } {
  let advice = raw.advice.trim();
  const followup = raw.followup.trim();

  // 1. Strip forbidden words
  for (const pattern of FORBIDDEN_WORDS) {
    advice = advice.replace(pattern, "marknadens snitt");
  }

  // 2. Enforce hard max sentence count (5 total — incl. disclaimer & followup)
  const sentences = dedupeSentences(splitSentences(advice));
  if (sentences.length > 5) {
    advice = sentences.slice(0, 5).join(" ");
  }

  // 3. Add disclaimer if amounts are mentioned
  if (raw.includes_amount && !/med reservation/i.test(advice)) {
    advice = advice.replace(/\.?\s*$/, ". ") + DISCLAIMER;
  }

  // 4. Append followup question
  if (followup && !advice.includes(followup)) {
    advice = advice.replace(/\.?\s*$/, ". ") + followup;
  }

  // 4b. Final hard cap — max 5 sentences after disclaimer + followup
  const finalSentencesCapped = dedupeSentences(splitSentences(advice));
  if (finalSentencesCapped.length > 5) {
    advice = finalSentencesCapped.slice(0, 5).join(" ");
  }

  // 5. Dedupe against last assistant message
  const lastAssistant = [...history].reverse().find((h) => h.role === "assistant");
  if (lastAssistant) {
    const prevSentences = new Set(
      splitSentences(lastAssistant.content).map((s) => s.toLowerCase().replace(/\s+/g, " ").trim())
    );
    const finalSentences = splitSentences(advice).filter(
      (s) => !prevSentences.has(s.toLowerCase().replace(/\s+/g, " ").trim())
    );
    if (finalSentences.length > 0) {
      advice = finalSentences.join(" ");
    }
  }

  // 6. Remove exclamation marks
  advice = advice.replace(/!/g, ".");

  return { advice: advice.trim(), situation_summary: raw.situation_summary };
}

async function synthesiseAdvice(
  message: string,
  situation: string,
  ciResults: CIResult[],
  context?: AgentRequest["context"],
  history: ConversationTurn[] = []
): Promise<{ advice: string; situation_summary: string }> {
  const repeatAwareReply = buildRepeatAwareReply(message, history, ciResults);
  if (repeatAwareReply) {
    return { advice: repeatAwareReply, situation_summary: situation };
  }

  const dataContext = ciResults
    .filter((r) => r.ok)
    .map((r) => `### ${r.capability}\n\`\`\`json\n${JSON.stringify(r.data.data, null, 2)}\n\`\`\`\nKälla: ${JSON.stringify(r.data.source)}`)
    .join("\n\n");

  const failedCaps = ciResults
    .filter((r) => !r.ok)
    .map((r) => `${r.capability}: ${JSON.stringify(r.data.errors ?? r.data.error)}`)
    .join("; ");

  const contextStr = context
    ? `\nAnvändarens profil: roll=${context.role || "okänd"}, ort=${context.geography || "okänd"}, anställningsform=${context.employment_type || "okänd"}${context.current_rate ? `, nuvarande timpris=${context.current_rate} kr` : ""}${context.current_salary ? `, nuvarande månadslön=${context.current_salary} kr` : ""}`
    : "";
  const historyStr = history.length
    ? `\nSenaste konversation:\n${formatHistoryForPrompt(history)}`
    : "";

  const isShortConfirmation = /^\s*(ja|japp|jo|jepp|nej|nope|stämmer|precis|absolut|ok|okej)[\s.!?]*$/i.test(message.trim());
  const shortConfirmationNotice = isShortConfirmation
    ? `\n\nVIKTIGT: Användarens meddelande är en kort bekräftelse på din egen följdfråga. Föregående svar har redan presenterat zon, kundpris, ersättningsspann och nuvarande ersättning — upprepa INTE dessa siffror eller samma argument. Ge ETT nytt argument eller en ny vinkel som inte fanns i föregående svar, och avsluta med en NY motfråga.`
    : "";

  const userPrompt = `Användarens fråga: "${message}"

Situation: ${situation}${contextStr}${historyStr}

Marknadsdata:
${dataContext || "Ingen data tillgänglig."}
${failedCaps ? `\nMisslyckade datahämtningar: ${failedCaps}` : ""}
${shortConfirmationNotice}

Ge råd baserat på ovanstående data. Fråga INTE efter information som redan finns i profilen ovan.`;

  const result = await callAI(
    ADVICE_SYSTEM,
    userPrompt,
    [ADVICE_TOOL],
    { type: "function", function: { name: "negotiation_advice" } }
  ) as { choices: { message: { tool_calls?: { function: { arguments: string } }[] } }[] };

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { advice: "Kunde inte generera råd just nu.", situation_summary: situation };
  }

  // Parse + Zod-validate LLM output, then apply deterministic post-processing
  let validated: AdviceOutput;
  try {
    validated = parseAndValidateToolOutput(toolCall.function.arguments);
  } catch (zodErr) {
    console.error("[AGENT] Zod validation failed:", zodErr);
    return { advice: "Kunde inte generera råd just nu.", situation_summary: situation };
  }

  return validateAdvice(validated, history);
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limiting — 20 requests per IP per hour
    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const rl = await checkRateLimit(sbAdmin, "salary-negotiation-agent", clientIp, 20, 60);
    if (!rl.allowed) {
      return rateLimitResponse(rl, corsHeaders);
    }

    // Per-user daily AI quota
    const userId = await getAuthUserId(req);
    const aiRl = await checkAiRateLimit(userId);
    if (!aiRl.allowed) return aiRateLimitResponse(aiRl, corsHeaders);

    const { message, context, history: rawHistory } = (await req.json()) as AgentRequest;
    const history = normalizeHistory(rawHistory);

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "INVALID_INPUT", message: "Meddelande saknas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "INVALID_INPUT", message: "Meddelandet är för långt (max 2000 tecken)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Extract intent
    const intent = await extractIntent(message, context, history);
    console.log("[AGENT] Intent extracted:", JSON.stringify({ caps: intent.capabilities.length, situation: intent.user_situation }));

    // Merge context into capability params where missing
    if (context) {
      for (const cap of intent.capabilities) {
        if (context.role && !cap.params.role && !cap.params.role_a) {
          cap.params.role = context.role;
        }
        if (context.geography && !cap.params.geography) {
          cap.params.geography = context.geography;
        }
        if (context.employment_type && !cap.params.employment_type) {
          cap.params.employment_type = context.employment_type;
        }
        if (context.current_salary && cap.capability === "salary_position" && !cap.params.current_salary) {
          cap.params.current_salary = context.current_salary;
        }
      }
    }

    // Fallback: if AI returned no capabilities but we have context, auto-generate calls
    if (intent.capabilities.length === 0 && context?.role) {
      console.log("[AGENT] No capabilities from AI — applying context-based fallback");
      // Always try lookup_rate if we have role + geography
      if (context.geography) {
        intent.capabilities.push({
          capability: "lookup_rate",
          params: {
            role: context.role,
            geography: context.geography,
            ...(context.employment_type ? { employment_type: context.employment_type } : {}),
          },
        });
      }
      // Try salary_position if we have current_salary
      if (context.current_salary) {
        intent.capabilities.push({
          capability: "salary_position",
          params: {
            role: context.role,
            current_salary: context.current_salary,
            ...(context.geography ? { geography: context.geography } : {}),
          },
        });
      }
      // Fallback to salary_benchmark if nothing else
      if (intent.capabilities.length === 0) {
        intent.capabilities.push({
          capability: "salary_benchmark",
          params: { role: context.role },
        });
      }
    }

    // For consultant compensation, only SKR frame agreement lookups are allowed.
    if (context?.employment_type === "foretagare" || context?.employment_type === "anstalld") {
      intent.capabilities = intent.capabilities.filter((cap) => cap.capability !== "salary_benchmark" && cap.capability !== "salary_position");
    }

    // Ensure lookup_rate is always included when we have role + geography
    // (it's the most reliable capability — backed by the full rates table)
    if (context?.role && context?.geography) {
      const hasLookup = intent.capabilities.some((c) => c.capability === "lookup_rate");
      if (!hasLookup) {
        intent.capabilities.unshift({
          capability: "lookup_rate",
          params: {
            role: context.role,
            geography: context.geography,
            ...(context.employment_type ? { employment_type: context.employment_type } : {}),
          },
        });
      }
    }

    // Step 2: Call CI capabilities in parallel
    const ciResults = await Promise.all(
      intent.capabilities.map(async (cap) => {
        const result = await callCI(cap.capability, cap.params, clientIp);
        return { capability: cap.capability, ...result };
      })
    );

    // Step 3: Synthesise advice
    const { advice, situation_summary } = await synthesiseAdvice(
      message,
      intent.user_situation,
      ciResults,
      context,
      history
    );

    // Collect sources and policy info
    const sources = ciResults
      .filter((r) => r.ok && r.data.source)
      .map((r) => r.data.source as { name: string; version: string; confidence: string });

    const uniqueSources = Array.from(
      new Map(sources.map((s) => [s.name, s])).values()
    );

    const response: AgentResponse = {
      advice: sanitizeReijdarText(advice),
      situation_summary: sanitizeReijdarText(situation_summary),
      data_points: ciResults.filter((r) => r.ok).map((r) => ({
        capability: r.capability,
        data: r.data.data,
      })),
      sources: uniqueSources.map((source) => ({
        ...source,
        name: sanitizeReijdarText(source.name),
      })),
      policy: {
        all_allowed: ciResults.every((r) => r.ok),
        any_fallback: ciResults.some((r) => r.ok && (r.data.policy as Record<string, unknown>)?.fallback_applied),
      },
      capabilities_used: ciResults.filter((r) => r.ok).map((r) => r.capability),
      missing_info: intent.missing_info.map((item) => sanitizeReijdarText(item)),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AGENT] Error:", error);

    const isAiError = error instanceof Error && error.message.startsWith("AI_GATEWAY_");
    const status = isAiError
      ? (error.message === "AI_GATEWAY_429" ? 429 : error.message === "AI_GATEWAY_402" ? 402 : 500)
      : 500;

    const userMessage = status === 429
      ? "Tillfälligt hög belastning — försök igen om en stund."
      : status === 402
      ? "AI-tjänsten är tillfälligt otillgänglig."
      : "Internt fel — försök igen.";

    return new Response(
      JSON.stringify({ error: "AGENT_ERROR", message: userMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
