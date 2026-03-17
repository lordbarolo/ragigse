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

interface RegionPrediction {
  region_namn: string;
  senaste_avrop_datum: string;
  snitt_dagar_mellan_avrop: number;
  predikterat_nasta_datum: string;
  antal_historiska_avrop: number;
  dagar_kvar: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const roll = url.searchParams.get("roll") || "";

    if (!roll) {
      return new Response(JSON.stringify({ error: "Parameter 'roll' krävs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows, error } = await supabase
      .from("calloff_history")
      .select("*")
      .eq("yrkeskategori", roll)
      .order("calloff_date", { ascending: false });

    if (error) throw error;

    const today = new Date();
    const todayMs = today.getTime();

    // Group by location (region)
    const groups = new Map<string, CalloffRow[]>();
    for (const row of rows as CalloffRow[]) {
      const key = row.location;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const predictions: RegionPrediction[] = [];

    for (const [regionNamn, calloffs] of groups) {
      if (calloffs.length < 3) continue; // Min 3 historical

      // Sort descending
      calloffs.sort(
        (a, b) =>
          new Date(b.calloff_date).getTime() - new Date(a.calloff_date).getTime()
      );

      // Calculate intervals
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
      const predictedNextMs = lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000;
      const predictedNext = new Date(predictedNextMs);
      const daysLeft = Math.round((predictedNextMs - todayMs) / (1000 * 60 * 60 * 24));

      predictions.push({
        region_namn: regionNamn,
        senaste_avrop_datum: calloffs[0].calloff_date,
        snitt_dagar_mellan_avrop: avgInterval,
        predikterat_nasta_datum: predictedNext.toISOString().split("T")[0],
        antal_historiska_avrop: calloffs.length,
        dagar_kvar: daysLeft,
      });
    }

    // Sort by dagar_kvar ascending
    predictions.sort((a, b) => a.dagar_kvar - b.dagar_kvar);

    // Also return available roles for the dropdown
    const { data: allRows } = await supabase
      .from("calloff_history")
      .select("yrkeskategori")
      .limit(1000);

    const roller = [...new Set((allRows || []).map((r: any) => r.yrkeskategori))].sort();

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
