import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, roll } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch from both tables in parallel
    const [{ data: requests }, { data: imports }] = await Promise.all([
      supabase
        .from("requests")
        .select("customer, role, specialization, created_at, region, filled, price_median, price_min, price_max")
        .eq("role", roll)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("calloff_imports")
        .select("customer, role, specialization, calloff_date, region, filled, price_median, price_min, price_max")
        .eq("role", roll)
        .order("calloff_date", { ascending: false })
        .limit(500),
    ]);

    // Normalize imports to match requests shape
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

    const today = new Date();
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
        return { region, count, senaste: dates[0].split("T")[0], avgInterval, predictedNext, avgPrice, customers: [...customers].slice(0, 3), fillRate };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const statsText = regionStats
      .map((r) => `- ${r.region}: ${r.count} uppdrag, senaste ${r.senaste}, snittintervall ${r.avgInterval ?? '?'} dagar, prognos nästa: ${r.predictedNext}, snittpris ${r.avgPrice ?? '?'} kr/tim, tillsättningsgrad ${r.fillRate}%, kunder: ${r.customers.join(', ')}`)
      .join("\n");

    const totalRequests = allData.length;
    const totalFilled = allData.filter((r: any) => r.filled).length;

    const systemPrompt = `Du är en AI-assistent specialiserad på den svenska bemanningsmarknaden inom vård och omsorg. Konsulten har rollen "${roll}".

Här är aggregerad data från uppdragsdatabasen för denna roll (totalt ${totalRequests} uppdrag, ${totalFilled} tillsatta):

${statsText}

Dagens datum: ${today.toISOString().split("T")[0]}

Svara alltid på svenska. Var konkret — ange specifika regionnamn, datum, priser och siffror. Ge inte generella råd. Om du inte har data för en fråga, säg det tydligt. Använd ordet "uppdrag" istället för "avrop". Priset avser timpris till kund (regionens pris till bemanningsföretag).`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "För många förfrågningar, försök igen om en stund." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Krediter slut, kontakta support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-fel" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
