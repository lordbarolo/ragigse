import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UnifiedRow {
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

/** Fetch from calloff_imports table */
async function fetchImports(supabase: any, roll: string): Promise<UnifiedRow[]> {
  const { data } = await supabase
    .from("calloff_imports")
    .select("customer, role, specialization, calloff_date, region, filled, price_median")
    .eq("role", roll)
    .order("calloff_date", { ascending: false });
  return (data || []).map((r: any) => ({
    customer: r.customer || "Okänd",
    role: r.role,
    specialization: r.specialization,
    created_at: r.calloff_date,
    region: r.region,
    filled: r.filled ?? false,
    price_median: r.price_median,
  }));
}

/** Get all unique roles from calloff_imports */
async function fetchAllRoles(supabase: any): Promise<string[]> {
  const { data } = await supabase.from("calloff_imports").select("role").limit(2000);
  const roles = new Set<string>();
  for (const r of (data || [])) {
    if (r.role) roles.add(r.role);
  }
  return [...roles].sort();
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
      const roller = await fetchAllRoles(supabase);
      return new Response(JSON.stringify({ predictions: [], roller }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allRows: UnifiedRow[] = (await fetchImports(supabase, roll))
      .filter((r) => r.region && r.created_at);

    const today = new Date();
    const todayMs = today.getTime();

    // Group by region
    const groups = new Map<string, UnifiedRow[]>();
    for (const row of allRows) {
      const key = row.region;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const predictions: RegionPrediction[] = [];

    for (const [regionNamn, reqs] of groups) {
      if (reqs.length < 3) continue;

      reqs.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

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

      const prices = reqs.filter((r) => r.price_median).map((r) => r.price_median!);
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

    predictions.sort((a, b) => a.dagar_kvar - b.dagar_kvar);

    const roller = await fetchAllRoles(supabase);

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
