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

    // Fetch aggregated data for context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: calloffs } = await supabase
      .from("calloff_history")
      .select("*")
      .eq("yrkeskategori", roll)
      .order("calloff_date", { ascending: false })
      .limit(500);

    // Build stats: top 5 regions by frequency, latest date per region, prediction
    const regionMap = new Map<string, { count: number; dates: string[] }>();
    for (const row of calloffs || []) {
      const key = row.location;
      if (!regionMap.has(key)) regionMap.set(key, { count: 0, dates: [] });
      const entry = regionMap.get(key)!;
      entry.count++;
      entry.dates.push(row.calloff_date);
    }

    const today = new Date();
    const regionStats = [...regionMap.entries()]
      .map(([region, { count, dates }]) => {
        dates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
        const intervals: number[] = [];
        for (let i = 0; i < dates.length - 1 && i < 10; i++) {
          const diff = (new Date(dates[i]).getTime() - new Date(dates[i + 1]).getTime()) / (1000 * 60 * 60 * 24);
          intervals.push(Math.round(diff));
        }
        const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
        const predictedNext = avgInterval ? new Date(new Date(dates[0]).getTime() + avgInterval * 86400000).toISOString().split("T")[0] : "okänt";
        return { region, count, senaste: dates[0], avgInterval, predictedNext };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const statsText = regionStats
      .map((r) => `- ${r.region}: ${r.count} uppdrag, senaste ${r.senaste}, snittintervall ${r.avgInterval ?? '?'} dagar, prediktion nästa: ${r.predictedNext}`)
      .join("\n");

    const systemPrompt = `Du är en AI-assistent specialiserad på den svenska bemanningsmarknaden inom vård och omsorg. Konsulten har rollen "${roll}".

Här är aggregerad data från uppdragsdatabasen för denna roll:

${statsText}

Dagens datum: ${today.toISOString().split("T")[0]}

Svara alltid på svenska. Var konkret — ange specifika regionnamn, datum och siffror. Ge inte generella råd. Om du inte har data för en fråga, säg det tydligt. Använd ordet "uppdrag" istället för "avrop".`;

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
