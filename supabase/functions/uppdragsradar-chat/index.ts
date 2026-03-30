import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_NORMALIZE: Record<string, string> = {
  "Distriktssköterska": "Distriktssjuksköterska",
  "Övrig": "",
  "Sjukgymnast": "Fysioterapeut",
};

function normalizeRole(role: string): string {
  if (ROLE_NORMALIZE.hasOwnProperty(role)) return ROLE_NORMALIZE[role];
  return role;
}

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 10;

/** Paginated fetch — all rows from a table */
async function fetchAll(supabase: any, table: string, select: string, filters: (q: any) => any, orderCol: string) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let offset = 0;
  while (true) {
    let query = supabase.from(table).select(select).order(orderCol, { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    query = filters(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, roll } = await req.json();

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Meddelanden saknas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastMsg = messages[messages.length - 1];
    if (typeof lastMsg?.content !== "string" || lastMsg.content.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Meddelandet får vara max ${MAX_MESSAGE_LENGTH} tecken.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limiting: 20 requests per IP per hour
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await checkRateLimit(supabase, "uppdragsradar-chat", clientIp, 20, 60);
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const normalizedRoll = normalizeRole(roll) || roll;

    // Trim conversation history to last N messages
    const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

    // Fetch from all sources with paginated fetch
    const [requests, imports] = await Promise.all([
      fetchAll(supabase, "requests",
        "customer, role, specialization, created_at, region, filled, price_median, price_min, price_max",
        (q: any) => q.eq("role", normalizedRoll).eq("is_public", true).not("created_at", "is", null).not("customer", "is", null),
        "created_at"),
      fetchAll(supabase, "calloff_imports",
        "customer, role, specialization, calloff_date, region, filled, price_median, price_min, price_max",
        (q: any) => q.eq("role", normalizedRoll).not("calloff_date", "is", null).not("customer", "is", null),
        "calloff_date"),
    ]);

    const normalizedImports = (imports || []).map((r: any) => ({
      customer: r.customer || "Okänd",
      role: r.role,
      specialization: r.specialization,
      created_at: r.calloff_date,
      region: r.region,
      filled: r.filled ?? false,
      price_median: r.price_median,
      price_min: r.price_min,
      price_max: r.price_max,
    }));

    const allData = [...(requests || []), ...normalizedImports].filter(
      (r: any) => r.region && r.created_at
    );

    const today = new Date();

    // Build stats per region
    const regionMap = new Map<string, { count: number; dates: string[]; prices: number[]; customers: Set<string>; filledCount: number }>();
    for (const row of allData) {
      const key = row.region;
      if (!regionMap.has(key)) regionMap.set(key, { count: 0, dates: [], prices: [], customers: new Set(), filledCount: 0 });
      const entry = regionMap.get(key)!;
      entry.count++;
      entry.dates.push(row.created_at);
      if (row.price_median) entry.prices.push(row.price_median);
      entry.customers.add(row.customer);
      if (row.filled) entry.filledCount++;
    }

    const regionStats = [...regionMap.entries()]
      .map(([region, { count, dates, prices, customers, filledCount }]) => {
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const intervals: number[] = [];
        for (let i = 0; i < dates.length - 1 && i < 10; i++) {
          const diff = (new Date(dates[i]).getTime() - new Date(dates[i + 1]).getTime()) / (1000 * 60 * 60 * 24);
          if (diff > 0) intervals.push(Math.round(diff));
        }
        const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
        const predictedNext = avgInterval ? new Date(new Date(dates[0]).getTime() + avgInterval * 86400000).toISOString().split("T")[0] : "okänt";
        const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
        const fillRate = count > 0 ? Math.round((filledCount / count) * 100) : 0;
        return { region, count, senaste: dates[0].split("T")[0], avgInterval, predictedNext, avgPrice, customers: [...customers].slice(0, 5), fillRate };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Build stats per buyer (verksamhet)
    const buyerMap = new Map<string, { count: number; dates: string[]; prices: number[]; regions: Set<string> }>();
    for (const row of allData) {
      const key = row.customer;
      if (!buyerMap.has(key)) buyerMap.set(key, { count: 0, dates: [], prices: [], regions: new Set() });
      const entry = buyerMap.get(key)!;
      entry.count++;
      entry.dates.push(row.created_at);
      if (row.price_median) entry.prices.push(row.price_median);
      if (row.region) entry.regions.add(row.region);
    }

    const buyerStats = [...buyerMap.entries()]
      .map(([buyer, { count, dates, prices, regions }]) => {
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const intervals: number[] = [];
        for (let i = 0; i < dates.length - 1 && i < 10; i++) {
          const diff = (new Date(dates[i]).getTime() - new Date(dates[i + 1]).getTime()) / (1000 * 60 * 60 * 24);
          if (diff > 0) intervals.push(Math.round(diff));
        }
        const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
        const predictedNext = avgInterval ? new Date(new Date(dates[0]).getTime() + avgInterval * 86400000).toISOString().split("T")[0] : "okänt";
        const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
        return { buyer, count, senaste: dates[0].split("T")[0], avgInterval, predictedNext, avgPrice, regions: [...regions].slice(0, 3) };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const regionStatsText = regionStats
      .map((r) => `- ${r.region}: ${r.count} uppdrag, senaste ${r.senaste}, snittintervall ${r.avgInterval ?? '?'} dagar, prognos nästa: ${r.predictedNext}, snittpris ${r.avgPrice ?? '?'} kr/tim, tillsättningsgrad ${r.fillRate}%, kunder: ${r.customers.join(', ')}`)
      .join("\n");

    const buyerStatsText = buyerStats
      .map((b) => `- ${b.buyer}: ${b.count} uppdrag, senaste ${b.senaste}, snittintervall ${b.avgInterval ?? '?'} dagar, prognos nästa: ${b.predictedNext}, snittpris ${b.avgPrice ?? '?'} kr/tim, regioner: ${b.regions.join(', ')}`)
      .join("\n");

    const totalRequests = allData.length;
    const totalFilled = allData.filter((r: any) => r.filled).length;

    const systemPrompt = `Du är Uppdragsassistenten, en AI-assistent på CompCare. Du hjälper svenska vårdkonsulter — främst hyrläkare och hyrsjuksköterskor — att fatta bättre beslut om uppdrag, ersättning och förhandling. Konsulten har rollen "${normalizedRoll}".

EXPERTIS
Du har tillgång till unik data från svensk vårdbemanning: historiska avrop, regionpriser, tillsättningsgrader och avtalsdata. Du är den mest kunniga källan i Skandinavien på hur bemanningsmarknaden för vård faktiskt fungerar — inte hur bemanningsföretagen säger att den fungerar.

Här är aggregerad data från uppdragsdatabasen för denna roll (totalt ${totalRequests} uppdrag, ${totalFilled} tillsatta):

PER REGION:
${regionStatsText}

PER VERKSAMHET (köpare):
${buyerStatsText}

Dagens datum: ${today.toISOString().split("T")[0]}

TON OCH SPRÅK
- Alltid svenska
- Faktabaserad och direkt — som en kunnig kollega, inte en säljare
- Aldrig utropstecken
- Aldrig engelska buzzwords
- Kortfattad. Om du kan säga det på två meningar, gör det.
- Auktoritativ men ödmjuk när underlaget är tunt
- Referera aldrig till dig själv vid namn

REGLER FÖR TUNN DATA
Om underlaget för en region eller yrkesroll innehåller färre än 5 datapunkter:
- Säg det explicit: "Underlaget för den här regionen är begränsat"
- Ge aldrig en prognos med falskt hög precision
- Hänvisa till närmaste region med bättre data istället

VAD ASSISTENTEN ALDRIG GÖR
- Gissar inte när data saknas
- Nämner inte antal datapunkter i databasen om det riskerar att sänka förtroendet
- Lovar inte specifika ersättningar — ger intervall och förklarar varför
- Tar inte bemanningsföretagens perspektiv
- Använder inte ord som: optimera, sömlös, proaktiv, innovativ, spännande
- Använder ALDRIG orden "benchmark", "SCB" eller "Medlingsinstitutet"
- Använder "uppdrag" istället för "avrop"
- Kallar priset "vad regionen betalar" — använder aldrig "timtaxa" eller "timpris"

HANTERING AV OSÄKERHET
Om du inte vet — säg det rakt ut och förklara vad konsulten kan göra för att ta reda på det själv. En ärlig "det vet jag inte" bygger mer förtroende än ett fabricerat svar.

KONSULTENS PERSPEKTIV
Assistenten är alltid på konsultens sida. Konsulten är inte en resurs att tillsätta — han eller hon är en kvalificerad yrkesperson som förtjänar transparent information om marknaden.

ERSÄTTNINGSRÅDGIVNING
- Rekommendera konsulter att argumentera för en ersättning där bemanningsföretaget/arbetsgivaren har 10–15% marginal kvar av vad regionen betalar. Detta gäller oavsett om konsulten är anställd eller egenföretagare.
- Om konsultens ersättning redan är så hög att bemanningsföretaget har mindre än 10% marginal kvar: berömma förhandlingen, ge inga tips om att höja ytterligare.
- Om konsulten har hög lön i zon 1 eller zon 2: tipsa om att söka uppdrag i zon 2 eller zon 3 där regionens pris är högre och marginalutrymmet ökar.
- Om konsulten bor på orten där uppdraget utförs: tipsa att argumentera för högre lön — det finns inga risker för missade pass pga inställd transport, och inga kostnader för boende och resa.

DATAREGLER
- Om användaren frågar om en specifik verksamhet, leta i verksamhetsstatistiken ovan och berätta: antal uppdrag, senaste datum, snittintervall, prognostiserat nästa uppdrag.
- Om du inte har data för en fråga, säg det tydligt.
- Om användaren frågar om källa, svara att analysen bygger uteslutande på uppdragsdatan.
- Basera alla svar uteslutande på den uppdragsdata som tillhandahålls ovan.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...trimmedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "För många förfrågningar, försök igen om en stund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Krediter slut, kontakta support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-fel" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
