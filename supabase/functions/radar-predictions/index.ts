import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CalloffRow {
  buyer: string;
  yrkeskategori: string;
  zon: string;
  location: string;
  duration_weeks: number | null;
  calloff_date: string;
}

interface Prediction {
  id: string;
  buyer: string;
  competence: string;
  location: string;
  status: "high" | "medium" | "watch";
  forecastWindow: string;
  historicalSignal: string;
  lastActivity: string;
  calloffCount: number;
  avgIntervalDays: number;
  summary: string;
  reasons: string[];
  history: { date: string; description: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const competenceFilter = url.searchParams.get("competence") || "";
    const locationFilter = url.searchParams.get("location") || "";
    const buyerFilter = url.searchParams.get("buyer") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("calloff_history")
      .select("*")
      .order("calloff_date", { ascending: false });

    if (competenceFilter) query = query.eq("yrkeskategori", competenceFilter);
    if (locationFilter) query = query.eq("location", locationFilter);
    if (buyerFilter) query = query.eq("buyer", buyerFilter);

    const { data: rows, error } = await query;
    if (error) throw error;

    const today = new Date();
    const todayMs = today.getTime();

    // Group by buyer + yrkeskategori + location
    const groups = new Map<string, CalloffRow[]>();
    for (const row of rows as CalloffRow[]) {
      const key = `${row.buyer}|${row.yrkeskategori}|${row.location}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const predictions: Prediction[] = [];

    for (const [key, calloffs] of groups) {
      const [buyer, competence, location] = key.split("|");
      // Sort by date descending
      calloffs.sort(
        (a, b) =>
          new Date(b.calloff_date).getTime() -
          new Date(a.calloff_date).getTime()
      );

      const count = calloffs.length;
      if (count < 2) continue; // Need at least 2 for interval

      // Calculate intervals between consecutive calloffs
      const intervals: number[] = [];
      for (let i = 0; i < calloffs.length - 1; i++) {
        const d1 = new Date(calloffs[i].calloff_date).getTime();
        const d2 = new Date(calloffs[i + 1].calloff_date).getTime();
        intervals.push(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
      }
      const avgInterval = Math.round(
        intervals.reduce((a, b) => a + b, 0) / intervals.length
      );

      const lastDate = new Date(calloffs[0].calloff_date);
      const daysSinceLast = Math.round(
        (todayMs - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine status based on where we are in the interval cycle
      const ratio = daysSinceLast / avgInterval;
      let status: "high" | "medium" | "watch";
      let forecastWindow: string;

      if (ratio >= 0.8) {
        status = "high";
        const weeksLeft = Math.max(
          1,
          Math.round(((avgInterval - daysSinceLast) / 7) * 1)
        );
        forecastWindow =
          weeksLeft <= 1
            ? "Sannolikt inom 1 vecka"
            : `Sannolikt inom ${weeksLeft}–${weeksLeft + 2} veckor`;
      } else if (ratio >= 0.5) {
        status = "medium";
        const weeksUntil = Math.round((avgInterval * 0.8 - daysSinceLast) / 7);
        forecastWindow = `Möjligt inom ${Math.max(2, weeksUntil)}–${Math.max(4, weeksUntil + 2)} veckor`;
      } else {
        status = "watch";
        const weeksUntil = Math.round((avgInterval * 0.8 - daysSinceLast) / 7);
        forecastWindow = `Bevaka kommande ${Math.max(4, weeksUntil)}–${Math.max(6, weeksUntil + 2)} veckor`;
      }

      const reasons: string[] = [
        `${count} avrop senaste 18 månaderna hos ${buyer}`,
        `Genomsnittligt intervall: ${avgInterval} dagar`,
        `Senaste avropet var ${daysSinceLast} dagar sedan`,
      ];

      if (ratio >= 0.9) {
        reasons.push("Nästa avropsfönster har sannolikt redan öppnat");
      }

      const history = calloffs.map((c) => ({
        date: c.calloff_date,
        description: `Avrop ${competence.toLowerCase()}, ${c.duration_weeks || "?"} veckor`,
      }));

      predictions.push({
        id: `pred-${buyer.replace(/\s/g, "")}-${competence.replace(/\s/g, "")}`,
        buyer,
        competence,
        location,
        status,
        forecastWindow,
        historicalSignal: `${count} liknande avrop senaste 18 månader`,
        lastActivity: `Senaste avrop: ${daysSinceLast} dagar sedan`,
        calloffCount: count,
        avgIntervalDays: avgInterval,
        summary: `${competence} hos ${buyer} har avropats ${count} gånger med ett genomsnittligt intervall på ${avgInterval} dagar.`,
        reasons,
        history,
      });
    }

    // Sort: high first, then medium, then watch. Within same status, by daysSinceLast/avgInterval ratio desc
    const statusOrder = { high: 0, medium: 1, watch: 2 };
    predictions.sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status])
        return statusOrder[a.status] - statusOrder[b.status];
      // Higher ratio = more urgent
      const ratioA =
        parseInt(a.lastActivity.match(/(\d+)/)?.[1] || "0") /
        a.avgIntervalDays;
      const ratioB =
        parseInt(b.lastActivity.match(/(\d+)/)?.[1] || "0") /
        b.avgIntervalDays;
      return ratioB - ratioA;
    });

    // Also return distinct filter values
    const allRows = rows as CalloffRow[];
    const filters = {
      competences: [...new Set(allRows.map((r) => r.yrkeskategori))].sort(),
      locations: [...new Set(allRows.map((r) => r.location))].sort(),
      buyers: [...new Set(allRows.map((r) => r.buyer))].sort(),
    };

    return new Response(JSON.stringify({ predictions, filters }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
