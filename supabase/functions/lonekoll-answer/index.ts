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

async function lookupRate(
  supabase: ReturnType<typeof createClient>,
  role: string,
  kommun: string | undefined,
): Promise<{ timpris_kund: number; zon: string; yrkeskategori: string } | null> {
  // Resolve zone (zon text) from kommun via regions->? In rates we have `zon` text.
  // Geographies table likely has zone mapping. Simplest: try direct match on yrkeskategori,
  // get all zones for role, then we don't know which zone applies. Use geographies if available.
  let zon: string | null = null;
  if (kommun) {
    const { data: geo } = await supabase
      .from("geographies")
      .select("code, name, parent_id")
      .or(`name.ilike.${kommun},code.ilike.${kommun}`)
      .limit(1)
      .maybeSingle();
    if (geo?.code) zon = geo.code;
  }

  const query = supabase.from("rates").select("yrkeskategori, zon, timpris_kund").ilike("yrkeskategori", role);
  if (zon) query.eq("zon", zon);
  const { data: rates } = await query.limit(1);
  if (rates && rates.length > 0) {
    const r = rates[0] as { yrkeskategori: string; zon: string; timpris_kund: number };
    return r;
  }

  // Try role_aliases
  const { data: alias } = await supabase
    .from("role_aliases")
    .select("canonical_role")
    .ilike("alias", role)
    .maybeSingle();
  if (alias?.canonical_role) {
    const q2 = supabase.from("rates").select("yrkeskategori, zon, timpris_kund").eq("yrkeskategori", alias.canonical_role);
    if (zon) q2.eq("zon", zon);
    const { data: r2 } = await q2.limit(1);
    if (r2 && r2.length > 0) return r2[0] as { yrkeskategori: string; zon: string; timpris_kund: number };
  }

  return null;
}

async function getMarginModel(
  supabase: ReturnType<typeof createClient>,
  employmentType: string | undefined,
): Promise<{ share_min: number; share_max: number; employer_factor: number; hours_per_month: number } | null> {
  const name = employmentType === "foretagare" ? "foretagare" : "anstalld";
  const { data } = await supabase
    .from("margin_models")
    .select("share_min, share_max, employer_factor, hours_per_month")
    .ilike("name", `%${name}%`)
    .eq("is_active", true)
    .maybeSingle();
  return data as { share_min: number; share_max: number; employer_factor: number; hours_per_month: number } | null;
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

  const rate = await lookupRate(supabase, ctx.role!, ctx.kommun);
  if (!rate) {
    return `Vi hittar inget aktuellt SKR-ramavtalspris för **${ctx.role}** i **${ctx.kommun}**. Det kan bero på att rollen inte är upphandlad i den zonen, eller att namnet behöver standardiseras. Kontakta oss så hjälper vi dig.`;
  }

  const margin = await getMarginModel(supabase, ctx.employment_type);
  if (!margin) {
    return `Vi kan inte visa möjlig ersättning för anställningstypen just nu. Försök igen senare.`;
  }

  const lo = rate.timpris_kund * Number(margin.share_min);
  const hi = rate.timpris_kund * Number(margin.share_max);
  const empType = ctx.employment_type === "foretagare" ? "konsult via eget bolag" : "anställd konsult";

  switch (questionId) {
    case "ranges": {
      const monthlyLo = ctx.employment_type === "foretagare"
        ? lo * margin.hours_per_month
        : (lo * margin.hours_per_month) / Number(margin.employer_factor);
      const monthlyHi = ctx.employment_type === "foretagare"
        ? hi * margin.hours_per_month
        : (hi * margin.hours_per_month) / Number(margin.employer_factor);
      return [
        `**Aktuellt SKR-ramavtalspris för ${rate.yrkeskategori} i ${ctx.kommun} (${rate.zon}):** ${fmt(rate.timpris_kund)} kr/h kundpris.`,
        ``,
        `**Förväntat spann för ${empType}:** ${fmt(lo)}–${fmt(hi)} kr/h.`,
        `Motsvarande månadsersättning: **${fmt(monthlyLo)}–${fmt(monthlyHi)} kr/mån**.`,
        ``,
        `Marginalen (${Math.round((1 - Number(margin.share_max)) * 100)}–${Math.round((1 - Number(margin.share_min)) * 100)}%) täcker bemanningsföretagets administration, rekrytering och risk.`,
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
      const samples: Array<{ kommun: string; rate: number; zon: string }> = [];
      for (const n of neighbours ?? []) {
        const r = await lookupRate(supabase, ctx.role!, (n as { kommun: string }).kommun);
        if (r && r.timpris_kund > rate.timpris_kund) {
          samples.push({ kommun: (n as { kommun: string }).kommun, rate: r.timpris_kund, zon: r.zon });
        }
      }
      samples.sort((a, b) => b.rate - a.rate);
      const top = samples.slice(0, 5);
      if (top.length === 0) {
        return `Inom **${ctx.region}** har vi inga närliggande orter med högre kundpris för **${rate.yrkeskategori}** än ${ctx.kommun} (${fmt(rate.timpris_kund)} kr/h).`;
      }
      return [
        `**Närliggande orter i ${ctx.region} med högre kundpris för ${rate.yrkeskategori}:**`,
        ``,
        ...top.map((t) => `- **${t.kommun}** (${t.zon}): ${fmt(t.rate)} kr/h`),
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
  const rate = ctx.role && ctx.kommun ? await lookupRate(supabase, ctx.role, ctx.kommun) : null;
  const margin = await getMarginModel(supabase, ctx.employment_type);

  if (!rate || !margin) {
    return `För att ge förhandlingsstöd behöver vi din roll, kommun och anställningsform. Komplettera i din profil eller gör en lönekoll först.`;
  }

  const lo = rate.timpris_kund * Number(margin.share_min);
  const median = rate.timpris_kund * ((Number(margin.share_min) + Number(margin.share_max)) / 2);
  const hi = rate.timpris_kund * Number(margin.share_max);
  const current = ctx.current_rate ?? (ctx.current_salary ? (ctx.current_salary * Number(margin.employer_factor)) / margin.hours_per_month : null);

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
        `2. **Jämför mot ramavtalets max:** ${fmt(rate.timpris_kund)} kr/h är kundpriset — din ersättning är förhandlingsbar.`,
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
  const rate = ctx.role && ctx.kommun ? await lookupRate(supabase, ctx.role, ctx.kommun) : null;

  const { data: empMargin } = await supabase.from("margin_models").select("share_min, share_max, employer_factor, hours_per_month").ilike("name", "%anstalld%").eq("is_active", true).maybeSingle();
  const { data: foreMargin } = await supabase.from("margin_models").select("share_min, share_max, employer_factor, hours_per_month").ilike("name", "%foretagare%").eq("is_active", true).maybeSingle();

  switch (questionId) {
    case "ab_vs_employee": {
      if (!rate || !empMargin || !foreMargin) {
        return `För att räkna på AB vs anställd behöver vi din roll och kommun. Komplettera i din profil.`;
      }
      const empMonthly = (rate.timpris_kund * Number(empMargin.share_max) * empMargin.hours_per_month) / Number(empMargin.employer_factor);
      const foreHourly = rate.timpris_kund * Number(foreMargin.share_max);
      const foreMonthly = foreHourly * foreMargin.hours_per_month; // gross to AB, before owner salary/tax
      return [
        `**${rate.yrkeskategori} i ${ctx.kommun} — AB vs anställd (övre spann):**`,
        ``,
        `- **Anställd via bf:** ~${fmt(empMonthly)} kr/mån brutto`,
        `- **Eget AB:** ~${fmt(foreHourly)} kr/h × ${foreMargin.hours_per_month} h = ${fmt(foreMonthly)} kr/mån till bolaget (före lön + sociala avgifter)`,
        ``,
        `**Vad du behöver tänka på som AB:**`,
        `- Du betalar arbetsgivaravgifter (~31%) + egen lön + bolagsskatt på vinst`,
        `- Du måste ha försäkringar (ansvar, sjuk, pension)`,
        `- Du står för vitesansvar själv`,
        `- Större upside vid längre uppdrag och hög omsättning`,
        ``,
        `**Tumregel:** AB lönar sig oftast vid >30 000 kr/mån i nettoöverskott, eller om du värdesätter friheten att styra själv.`,
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
        `Vid samma kundpris (${rate ? fmt(rate.timpris_kund) + " kr/h" : "X kr/h"}):`,
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
