// Lönekoll v2: answers a preprogrammed question from a fixed menu.
// Input: { topicId: 1|2|3|4, questionId: string }
//
// Context (role, region, employment_type, current rate/salary) is read
// server-side from consultant_profiles + latest report — client cannot
// manipulate it.
//
// Topic 1: dynamic rates from `rates` table + margin model (often 0 AI calls)
// Topic 2: RAG over indexed SKR contract chunks (no region gate)
// Topic 3: rates + neutral range observation + argument library
// Topic 4: company-vs-employee comparison (dynamic calculation)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  logAiUsage,
  extractTokensFromResponse,
  checkAiRateLimit,
  aiRateLimitResponse,
} from "../_shared/ai-usage-logger.ts";
import {
  EMPLOYER_FACTOR,
  MODEL_NOT_DISCLOSED,
  missingDataAnswer,
  possibleRange,
  resolveZone,
} from "../_shared/rate-guard.ts";
import { HOURS_PER_MONTH } from "../_shared/calc.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const CHAT_MODEL = "google/gemini-3-flash-preview";
const EMBED_MODEL = "openai/text-embedding-3-small";

const RequestSchema = z.object({
  topicId: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  questionId: z.string().min(1).max(80),
});

type UserContext = {
  role?: string;
  kommun?: string;
  region?: string;
  employment_type?: "anstalld" | "foretagare" | string;
  current_rate?: number;
  current_salary?: number;
  experience_years?: number;
};

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

async function loadContext(supabase: ReturnType<typeof createClient>, userId: string | null): Promise<UserContext> {
  if (!userId) return {};
  const ctx: UserContext = {};

  const { data: cp } = await supabase
    .from("consultant_profiles")
    .select("specialty_id, region_id, employment_type, current_hourly_rate, current_monthly_salary, experience_years")
    .eq("user_id", userId)
    .maybeSingle();

  if (cp) {
    if (cp.specialty_id) {
      const { data: spec } = await supabase.from("specialties").select("name").eq("id", cp.specialty_id).maybeSingle();
      if (spec?.name) ctx.role = spec.name;
    }
    if (cp.region_id) {
      const { data: geo } = await supabase.from("regions").select("kommun, region").eq("id", cp.region_id).maybeSingle();
      if (geo?.kommun) ctx.kommun = geo.kommun;
      if (geo?.region) ctx.region = geo.region;
    }
    if (cp.employment_type) ctx.employment_type = cp.employment_type;
    if (cp.current_hourly_rate) ctx.current_rate = cp.current_hourly_rate;
    if (cp.current_monthly_salary) ctx.current_salary = cp.current_monthly_salary;
    if (cp.experience_years) ctx.experience_years = cp.experience_years;
  }

  // Fallback to latest report
  if (!ctx.role || !ctx.kommun) {
    const { data: report } = await supabase
      .from("reports")
      .select("occupation, kommun, employment_type, result_json")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (report) {
      if (!ctx.role && report.occupation) ctx.role = report.occupation;
      if (!ctx.kommun && report.kommun) ctx.kommun = report.kommun;
      if (!ctx.employment_type && report.employment_type) ctx.employment_type = report.employment_type;
      const inputs = (report.result_json as { inputs?: { current_salary_sek?: number; salary_type?: string } } | null)?.inputs;
      if (inputs?.current_salary_sek && !ctx.current_rate && !ctx.current_salary) {
        if (inputs.salary_type === "hourly") ctx.current_rate = inputs.current_salary_sek;
        else ctx.current_salary = inputs.current_salary_sek;
      }
    }
  }

  // Resolve zone from kommun
  if (ctx.kommun && !ctx.region) {
    const { data: geo } = await supabase.from("regions").select("region").ilike("kommun", ctx.kommun).maybeSingle();
    if (geo?.region) ctx.region = geo.region;
  }

  return ctx;
}

// ── Topic 1 / 3: rate lookup helper ────────────────────────────────────────

/**
 * Kundpris för roll + kommun. Zonen härleds ALLTID ur kommunen via den delade
 * `resolveZone` (locations → regions). Utan zonmappning returneras
 * `{ reason: "zone" }` — vi visar aldrig priset för en gissad zon.
 */
async function lookupRate(
  supabase: ReturnType<typeof createClient>,
  role: string,
  kommun: string | undefined,
): Promise<
  | { ok: true; timpris_kund: number; zon: string; yrkeskategori: string }
  | { ok: false; reason: "zone" | "role" }
> {
  const zon = await resolveZone(supabase, kommun);
  if (!zon) return { ok: false, reason: "zone" };

  const { data: rates } = await supabase
    .from("rates")
    .select("yrkeskategori, zon, timpris_kund")
    .ilike("yrkeskategori", role)
    .eq("zon", zon)
    .limit(1);
  if (rates && rates.length > 0) {
    const r = rates[0] as { yrkeskategori: string; zon: string; timpris_kund: number };
    return { ok: true, ...r };
  }

  // Try role_aliases
  const { data: alias } = await supabase
    .from("role_aliases")
    .select("canonical_role")
    .ilike("alias", role)
    .maybeSingle();
  if (alias?.canonical_role) {
    const { data: r2 } = await supabase
      .from("rates")
      .select("yrkeskategori, zon, timpris_kund")
      .eq("yrkeskategori", alias.canonical_role)
      .eq("zon", zon)
      .limit(1);
    if (r2 && r2.length > 0) {
      const r = r2[0] as { yrkeskategori: string; zon: string; timpris_kund: number };
      return { ok: true, ...r };
    }
  }

  return { ok: false, reason: "role" };
}

/** Deterministiskt svar när underlag saknas — aldrig belopp, aldrig gissad zon. */
function noDataAnswer(reason: "zone" | "role", ctx: UserContext): string {
  if (reason === "zone") {
    return missingDataAnswer([
      `vilken kommun eller närliggande ort uppdraget gäller (vi saknar uppgift för ${ctx.kommun ?? "din ort"})`,
    ]);
  }
  return missingDataAnswer([
    `vilken roll som ligger närmast, eftersom vi saknar uppgift för ${ctx.role ?? "din roll"}`,
  ]);
}

/**
 * Möjlig ersättning per timme och månad. Marginalen är redan avdragen och
 * anställda räknas om med arbetsgivarfaktorn — endast dessa belopp får visas.
 */
function possibleForContext(customerPrice: number, ctx: UserContext) {
  const range = possibleRange(customerPrice, ctx.role ?? "", ctx.employment_type);
  return {
    ...range,
    mid: Math.round((range.min + range.max) / 2),
    monthlyMin: Math.round(range.min * HOURS_PER_MONTH),
    monthlyMax: Math.round(range.max * HOURS_PER_MONTH),
  };
}

// ── Topic 1 deterministic answers ──────────────────────────────────────────

function fmt(n: number): string {
  return Math.round(n).toLocaleString("sv-SE");
}


async function answerTopic1(
  supabase: ReturnType<typeof createClient>,
  questionId: string,
  ctx: UserContext,
): Promise<string> {
  const missing: string[] = [];
  if (!ctx.role) missing.push("yrkesroll");
  if (!ctx.kommun) missing.push("kommun");
  if (missing.length > 0) {
    return `För att besvara den här frågan behöver vi veta din ${missing.join(" och ")}. Komplettera i din profil eller gör en lönekoll först.`;
  }

  const lookup = await lookupRate(supabase, ctx.role!, ctx.kommun);
  if (!lookup.ok) return noDataAnswer(lookup.reason, ctx);
  const rate = lookup;

  const possible = possibleForContext(rate.timpris_kund, ctx);
  const empType = ctx.employment_type === "foretagare" ? "konsult via eget bolag" : "anställd konsult";

  switch (questionId) {
    case "ranges": {
      return [
        `**Möjlig ersättning för ${rate.yrkeskategori} i ${ctx.kommun} (${rate.zon}), som ${empType}:**`,
        ``,
        `**${fmt(possible.min)}–${fmt(possible.max)} kr/h.**`,
        `Motsvarande månadsersättning: **${fmt(possible.monthlyMin)}–${fmt(possible.monthlyMax)} kr/mån**.`,
        ``,
        MODEL_NOT_DISCLOSED,
      ].join("\n");
    }
    case "nearby": {
      // Get neighbouring kommuner from regions (same region)
      if (!ctx.region) {
        return `Vi behöver veta din region för att jämföra närliggande orter. Komplettera i din profil.`;
      }
      const { data: neighbours } = await supabase
        .from("regions")
        .select("kommun")
        .eq("region", ctx.region)
        .neq("kommun", ctx.kommun)
        .limit(20);
      const samples: Array<{ kommun: string; zon: string; min: number; max: number; sort: number }> = [];
      for (const n of neighbours ?? []) {
        const kommun = (n as { kommun: string }).kommun;
        const r = await lookupRate(supabase, ctx.role!, kommun);
        if (r.ok && r.timpris_kund > rate.timpris_kund) {
          const p = possibleForContext(r.timpris_kund, ctx);
          samples.push({ kommun, zon: r.zon, min: p.min, max: p.max, sort: r.timpris_kund });
        }
      }
      samples.sort((a, b) => b.sort - a.sort);
      const top = samples.slice(0, 5);
      if (top.length === 0) {
        return [
          `Inom **${ctx.region}** har vi inga närliggande orter med högre möjlig ersättning för **${rate.yrkeskategori}** än ${ctx.kommun}.`,
          ``,
          `Där ligger möjlig ersättning på **${fmt(possible.min)}–${fmt(possible.max)} kr/h**.`,
        ].join("\n");
      }
      return [
        `**Närliggande orter i ${ctx.region} med högre möjlig ersättning för ${rate.yrkeskategori}:**`,
        ``,
        ...top.map((t) => `- **${t.kommun}** (${t.zon}): ${fmt(t.min)}–${fmt(t.max)} kr/h`),
        ``,
        `Notera: Restid, boende och introduktion kan påverka din nettoersättning.`,
      ].join("\n");
    }

    case "cost_factors":
      return [
        `**Kostnader som ofta belastar bemanningsföretaget och kan motivera ett lägre timpris än ramavtalets max:**`,
        ``,
        `- **Resa** (km-ersättning, biljetter)`,
        `- **Boende** (hotell, korttidslägenhet)`,
        `- **Introduktion** (oavlönade timmar första passet)`,
        `- **Vitesansvar** vid uteblivet pass eller sen ankomst`,
        `- **HLR / S-HLR-certifiering** (kursavgift + uppdatering)`,
        `- **SITHS-kort / journalsystem-utbildning**`,
        `- **Begränsade arbetstider** (svårare att placera dig)`,
        ``,
        `När bemanningsföretaget står för dessa: räkna med 5–15 kr/h lägre nettoersättning till dig.`,
        `När du står för dem själv: argumentera för reseersättning utöver timpriset.`,
      ].join("\n");
    case "role_comparison":
      return [
        `**Jämförelse mot närliggande roller** beror på vilken spec. du jämför mot.`,
        ``,
        `Generellt i SKR-ramavtalen (${rate.zon}):`,
        `- Specialistsjuksköterska (anestesi/IVA/op/akut/barn): högsta kundpris bland sjuksköterskor`,
        `- Allmän sjuksköterska: lägst kundpris bland sjuksköterskor`,
        `- Specialistläkare: 2–3× sjuksköterskepriset`,
        ``,
        `Vill du veta exakta priser för en specifik annan roll: gå tillbaka och välj "Vad är spannet för min roll".`,
      ].join("\n");
    default:
      return `Frågan kunde inte hanteras.`;
  }
}

// ── Topic 2: RAG over SKR contract ─────────────────────────────────────────

async function answerTopic2(
  supabase: ReturnType<typeof createClient>,
  questionId: string,
  ctx: UserContext,
  apiKey: string,
  userId: string | null,
): Promise<{ text: string; aiCalls: number; tokens: { input: number; output: number } }> {
  const queries: Record<string, string> = {
    pricing: `Vilket pris gäller per yrkesroll och zon i ramavtalet? Hur är prislistan strukturerad?`,
    vendor_requirements: `Vilka krav ställs på leverantören (HOSP, CV, referenser, försäkring, kvalitetsansvar)?`,
    ob_jour: `Hur regleras OB-tillägg, jourpass, beredskap och övertid i ramavtalet?`,
    vitesansvar: `Vad gäller för vitesansvar och kontraktsvite vid uteblivet pass eller avbokning?`,
  };
  const query = queries[questionId];
  if (!query) {
    return { text: "Frågan kunde inte hanteras.", aiCalls: 0, tokens: { input: 0, output: 0 } };
  }

  // 1. Embed the query
  const embedResp = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: query }),
  });
  if (!embedResp.ok) throw new Error(`Embed failed: ${embedResp.status}`);
  const embedJson = await embedResp.json();
  const queryVec = embedJson.data?.[0]?.embedding;

  // 2. Retrieve top chunks via RPC
  const { data: chunks, error: matchErr } = await supabase.rpc("match_lonekoll_chunks", {
    query_embedding: queryVec as unknown as string,
    match_count: 6,
  });
  if (matchErr) throw matchErr;
  const matched = (chunks ?? []) as Array<{ source_doc: string; section: string | null; content: string; similarity: number }>;

  if (matched.length === 0) {
    return {
      text: `Vi har inte indexerat avtalstexten ännu. Be en administratör köra dokumentindexeringen, så kan vi svara på den här typen av frågor.`,
      aiCalls: 0,
      tokens: { input: 0, output: 0 },
    };
  }

  // 3. Call Gemini with strict RAG prompt
  const contextBlock = matched.map((c, i) =>
    `[${i + 1}] Källa: ${c.source_doc}${c.section ? ` — ${c.section}` : ""}\n${c.content}`,
  ).join("\n\n---\n\n");

  const systemPrompt = `Du är Lönekoll — en neutral assistent som svarar på frågor om SKR:s ramavtal för bemanning inom vården.

Regler:
- Svara ENDAST utifrån de bifogade avtalsutdragen nedan.
- Citera källa och avsnitt med [1], [2] osv när du refererar.
- Om svaret inte finns i utdragen: säg tydligt "Det framgår inte av de avtalsutdrag vi har indexerade." Föreslå inte spekulationer.
- Använd neutral, faktabaserad ton. Inga värdeladdade ord, ingen rådgivning utöver vad avtalet säger.
- Svar på svenska. Max 6 meningar. Använd kort punktlista om det förtydligar.`;

  const userPrompt = `Fråga: ${query}\n\nAvtalsutdrag:\n\n${contextBlock}`;

  const start = Date.now();
  const chatResp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!chatResp.ok) {
    const t = await chatResp.text();
    throw new Error(`Chat failed ${chatResp.status}: ${t}`);
  }
  const chatJson = await chatResp.json();
  const text = chatJson.choices?.[0]?.message?.content ?? "Inget svar kunde genereras.";
  const tokens = extractTokensFromResponse(chatJson);

  // Append sources
  const sources = [...new Set(matched.map((c) => c.source_doc))].join(", ");
  const finalText = `${text}\n\n---\n*Källor: ${sources}*`;

  // Log embedding + chat usage
  await logAiUsage({
    feature: "lonekoll-answer-topic2",
    model: CHAT_MODEL,
    userId,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    durationMs: Date.now() - start,
    metadata: { topic: 2, questionId, chunks: matched.length },
  });

  return { text: finalText, aiCalls: 1, tokens: { input: tokens.inputTokens, output: tokens.outputTokens } };
}

// ── Topic 3: negotiation framing ───────────────────────────────────────────

async function answerTopic3(
  supabase: ReturnType<typeof createClient>,
  questionId: string,
  ctx: UserContext,
): Promise<string> {
  if (!ctx.role || !ctx.kommun) {
    return `För att ge förhandlingsstöd behöver vi din roll, kommun och anställningsform. Komplettera i din profil eller gör en lönekoll först.`;
  }
  const lookup = await lookupRate(supabase, ctx.role, ctx.kommun);
  if (!lookup.ok) return noDataAnswer(lookup.reason, ctx);
  const rate = lookup;

  const possible = possibleForContext(rate.timpris_kund, ctx);
  const lo = possible.min;
  const median = possible.mid;
  const hi = possible.max;
  const current = ctx.current_rate ??
    (ctx.current_salary ? (ctx.current_salary * EMPLOYER_FACTOR) / HOURS_PER_MONTH : null);

  switch (questionId) {
    case "realistic_range": {
      // NEVER suggest below current
      const floor = current ? Math.max(lo, current) : lo;
      const ceiling = Math.max(hi, current ?? 0);
      return [
        `**Marknadsobservation för ${rate.yrkeskategori} i ${ctx.kommun} (${rate.zon}):**`,
        ``,
        `- Undre spann: ${fmt(lo)} kr/h`,
        `- Median: ${fmt(median)} kr/h`,
        `- Övre spann: ${fmt(hi)} kr/h`,
        current ? `- Din nuvarande ersättning: ${fmt(current)} kr/h` : ``,
        ``,
        `**Realistiskt att begära:** ${fmt(floor)}–${fmt(ceiling)} kr/h, beroende på vad bemanningsföretaget åtar sig (resa, boende, intro).`,
        ``,
        MODEL_NOT_DISCLOSED,
      ].filter(Boolean).join("\n");
    }

    case "arguments":
      return [
        `**Argument som stärker din position:**`,
        ``,
        `- **Erfarenhet:** Antal år i rollen, bredd av arbetsplatser, specialistkompetens.`,
        `- **Kontinuitet:** Du kan binda upp dig på längre uppdrag (oftare 6+ veckor → premie).`,
        `- **Egen utrustning:** SITHS-kort, HLR, körkort, egen bil → mindre kostnad för bf.`,
        `- **Geografisk flexibilitet:** Du kan ta uppdrag i flera zoner.`,
        `- **Egen försäkring** (om företagare): minskar bf:s risk.`,
        `- **Inga särskilda krav** (boende, restid): bf slipper extrakostnad.`,
        `- **Referensbart resultat:** Tidigare omdömen och förlängda uppdrag.`,
      ].join("\n");
    case "counteroffer":
      return [
        `**Hur du hanterar motbud:**`,
        ``,
        `1. **Fråga efter motiveringen:** "Vilka kostnader belastar uppdraget?" (resa, boende, intro, vite)`,
        `2. **Utgå från möjlig ersättning:** ${fmt(lo)}–${fmt(hi)} kr/h är nivån vi ser för din roll och ort — din ersättning är förhandlingsbar.`,
        `3. **Erbjud paket:** Lägre timpris mot längre uppdrag eller fler pass.`,
        `4. **Be om skriftligt:** Be om bemanningsbolagets kalkyl över vilka kostnader uppdraget medför. Många säger nej — vilket också är information.`,
        `5. **Ha en walk-away-nivå:** Skriv ner i förväg vilket pris du tackar nej under.`,
      ].join("\n");

    case "walk_away": {
      const walkAway = current ? current : lo;
      return [
        `**När bör du tacka nej?**`,
        ``,
        `Tre vanliga signaler:`,
        `- Erbjudandet är under din nuvarande ersättning${current ? ` (${fmt(current)} kr/h)` : ""}.`,
        `- Bemanningsföretaget vägrar specificera vilka kostnader som motiverar ett pris under ${fmt(lo)} kr/h.`,
        `- Du tar på dig vitesansvar utan motsvarande premie.`,
        ``,
        `**Riktmärke:** Acceptera inte under ${fmt(walkAway)} kr/h utan tydlig kompensation i form av kortare restid, garanterade timmar eller pasterminologi som ger högre faktisk ersättning.`,
      ].join("\n");
    }
    default:
      return `Frågan kunde inte hanteras.`;
  }
}

// ── Topic 4: company vs employee ──────────────────────────────────────────

async function answerTopic4(
  supabase: ReturnType<typeof createClient>,
  questionId: string,
  ctx: UserContext,
): Promise<string> {
  const lookup = ctx.role && ctx.kommun
    ? await lookupRate(supabase, ctx.role, ctx.kommun)
    : ({ ok: false, reason: "role" } as const);
  const rate = lookup.ok ? lookup : null;

  switch (questionId) {
    case "ab_vs_employee": {
      if (!rate) {
        if (ctx.role && ctx.kommun && !lookup.ok) return noDataAnswer(lookup.reason, ctx);
        return `För att räkna på AB vs anställd behöver vi din roll och kommun. Komplettera i din profil.`;
      }
      // Båda alternativen räknas med den delade modellen — marginalen är redan avdragen.
      const employed = possibleRange(rate.timpris_kund, ctx.role ?? "", "anstalld");
      const company = possibleRange(rate.timpris_kund, ctx.role ?? "", "foretagare");
      const empMonthly = employed.max * HOURS_PER_MONTH;
      const foreMonthly = company.max * HOURS_PER_MONTH;
      return [
        `**${rate.yrkeskategori} i ${ctx.kommun} — AB vs anställd (övre spann):**`,
        ``,
        `- **Anställd via bf:** ~${fmt(employed.max)} kr/h, ~${fmt(empMonthly)} kr/mån brutto`,
        `- **Eget AB:** ~${fmt(company.max)} kr/h till bolaget, ~${fmt(foreMonthly)} kr/mån (före lön + sociala avgifter)`,
        ``,
        `**Vad du behöver tänka på som AB:**`,
        `- Du betalar arbetsgivaravgifter (~31%) + egen lön + bolagsskatt på vinst`,
        `- Du måste ha försäkringar (ansvar, sjuk, pension)`,
        `- Du står för vitesansvar själv`,
        `- Större upside vid längre uppdrag och hög omsättning`,
        ``,
        `**Tumregel:** AB lönar sig oftast vid >30 000 kr/mån i nettoöverskott, eller om du värdesätter friheten att styra själv.`,
        ``,
        MODEL_NOT_DISCLOSED,
      ].join("\n");
    }

    case "vite_foretagare":
      return [
        `**Vitesansvar som företagare:**`,
        ``,
        `När du är konsult via eget AB är det **du som juridisk person** som står för vite, inte bemanningsföretaget.`,
        ``,
        `Vanliga vitesnivåer i ramavtalen:`,
        `- Uteblivet pass utan giltig anledning: 1–3 dagsersättningar`,
        `- Sen ankomst: timersättning × 2–3`,
        `- Avbruten uppdragsperiod: kan motsvara hela kontraktsvärdet`,
        ``,
        `**Skydd:** Teckna ansvarsförsäkring + avbrottsförsäkring. Förhandla in tydliga skrivningar om force majeure och sjukdom i uppdragsavtalet.`,
      ].join("\n");
    case "insurance_private":
      return [
        `**Försäkringar för konsult hos privat vårdgivare:**`,
        ``,
        `Hos privata vårdgivare ingår du **inte** automatiskt i regionens patientförsäkring (LÖF). Du behöver eget skydd:`,
        ``,
        `- **Patientförsäkring** (krav enligt patientskadelagen för privata vårdgivare — kontrollera vem som tecknar)`,
        `- **Yrkesansvarsförsäkring** (för rådgivnings-/behandlingsfel)`,
        `- **Sjukvårdsförsäkring** (för dig själv, ingår inte automatiskt som företagare)`,
        `- **Avbrottsförsäkring** (täcker inkomstbortfall vid sjukdom)`,
        `- **Olycksfallsförsäkring** (för uppdrag med fysisk risk)`,
        ``,
        `Be alltid att se vårdgivarens försäkringsbrev innan uppdragsstart.`,
      ].join("\n");
    case "net_diff":
      return [
        `**Nettoskillnad AB vs anställd (förenklat):**`,
        ``,
        `Vid samma uppdrag och samma nivå på möjlig ersättning:`,
        `- **Anställd:** Din arbetsgivare betalar arbetsgivaravgifter (~31,42%), pension, semester, sjuklön. Du får brutto, sedan inkomstskatt.`,
        `- **AB:** Du betalar arbetsgivaravgift på egen lön, men kan låta överskott stå i bolaget (22% bolagsskatt) och ta ut som utdelning (20% under 3:12-gränsen).`,
        ``,
        `**Praktisk nettoskillnad** är ofta **10–25% högre** för AB vid samma timpris — men förutsätter att du:`,
        `- Tar ut lön upp till brytpunkten för statlig skatt`,
        `- Använder 3:12-utdelning korrekt`,
        `- Har bokföring + revisor (~10 000–25 000 kr/år)`,
        ``,
        `Vill du ha en exakt beräkning på din situation: använd vårdbemanning.ai:s fakturakontroll eller kontakta en redovisningskonsult.`,
      ].join("\n");
    default:
      return `Frågan kunde inte hanteras.`;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { topicId, questionId } = parsed.data;

    // Rate limit only when AI is needed (topic 2)
    if (topicId === 2) {
      const limit = await checkAiRateLimit(userId);
      if (!limit.allowed) return aiRateLimitResponse(limit, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ctx = await loadContext(supabase, userId);

    let answer = "";
    if (topicId === 1) {
      answer = await answerTopic1(supabase, questionId, ctx);
    } else if (topicId === 2) {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
      const result = await answerTopic2(supabase, questionId, ctx, apiKey, userId);
      answer = result.text;
    } else if (topicId === 3) {
      answer = await answerTopic3(supabase, questionId, ctx);
    } else if (topicId === 4) {
      answer = await answerTopic4(supabase, questionId, ctx);
    }

    return new Response(JSON.stringify({ answer, context: ctx }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[lonekoll-answer] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
