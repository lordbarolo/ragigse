import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestRow {
  customer: string;
  role: string;
  specialization: string | null;
  created_at: string;
  region: string;
  filled: boolean;
  price_median: number | null;
}

interface RegionPrediction {
  region_namn: string;
  senaste_uppdrag_datum: string;
  snitt_dagar_mellan_uppdrag: number;
  predikterat_nasta_datum: string;
  antal_historiska_uppdrag: number;
  dagar_kvar: number;
  senaste_kund: string;
  medianpris: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const roll = url.searchParams.get("roll") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If no roll specified, just return available roles
    if (!roll || roll === "__all_roles__") {
      const { data: allRows } = await supabase
        .from("requests")
        .select("role")
        .limit(2000);
      const roller = [...new Set((allRows || []).map((r: any) => r.role))].sort();
      return new Response(JSON.stringify({ predictions: [], roller }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rows, error } = await supabase
      .from("requests")
      .select("customer, role, specialization, created_at, region, filled, price_median")
      .eq("role", roll)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const today = new Date();
    const todayMs = today.getTime();

    // Group by region
    const groups = new Map<string, RequestRow[]>();
    for (const row of rows as RequestRow[]) {
      const key = row.region;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const predictions: RegionPrediction[] = [];

    for (const [regionNamn, reqs] of groups) {
      if (reqs.length < 3) continue; // Min 3 historical

      // Sort descending by created_at
      reqs.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Calculate intervals between consecutive requests
      const intervals: number[] = [];
      for (let i = 0; i < reqs.length - 1; i++) {
        const d1 = new Date(reqs[i].created_at).getTime();
        const d2 = new Date(reqs[i + 1].created_at).getTime();
        const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) intervals.push(diffDays);
      }

      if (intervals.length === 0) continue;

      const avgInterval = Math.round(
        intervals.reduce((a, b) => a + b, 0) / intervals.length
      );

      const lastDate = new Date(reqs[0].created_at);
      const predictedNextMs = lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000;
      const predictedNext = new Date(predictedNextMs);
      const daysLeft = Math.round((predictedNextMs - todayMs) / (1000 * 60 * 60 * 24));

      // Median price from recent requests
      const prices = reqs.filter(r => r.price_median).map(r => r.price_median!);
      const medianpris = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : null;

      predictions.push({
        region_namn: regionNamn,
        senaste_uppdrag_datum: lastDate.toISOString().split("T")[0],
        snitt_dagar_mellan_uppdrag: avgInterval,
        predikterat_nasta_datum: predictedNext.toISOString().split("T")[0],
        antal_historiska_uppdrag: reqs.length,
        dagar_kvar: daysLeft,
        senaste_kund: reqs[0].customer,
        medianpris,
      });
    }

    // Sort by dagar_kvar ascending
    predictions.sort((a, b) => a.dagar_kvar - b.dagar_kvar);

    // Return available roles
    const { data: allRows } = await supabase
      .from("requests")
      .select("role")
      .limit(2000);
    const roller = [...new Set((allRows || []).map((r: any) => r.role))].sort();

    return new Response(JSON.stringify({ predictions, roller }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
