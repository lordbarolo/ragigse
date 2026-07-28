import {
  corsHeadersUser as corsHeaders,
  enforceUserRateLimit,
  requireUserAuth,
} from "../_shared/auth.ts";

// Absolute row cap on any single query into calloff_imports so a malformed /
// unfiltered request can never pull the entire register.
const MAX_TOTAL_ROWS = 100_000;
const RATE_LIMIT_PER_HOUR = 30;

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
  expected_calloffs?: number;
  confidence?: "low" | "med" | "high";
  is_seasonal_peak?: boolean;
  is_trend_break?: boolean;
  is_under_review?: boolean;
}

interface ForecastRow {
  customer: string;
  region: string;
  profession: string;
  specialization: string | null;
  month: string;
  expected_calloffs: number;
  seasonal_index: number | null;
  yoy_ratio: number | null;
  confidence: "low" | "med" | "high" | null;
  is_seasonal_peak: boolean;
  is_trend_break: boolean;
  is_under_review: boolean;
  generated_at: string;
}

/** Get all unique roles from calloff_imports (för UI-dropdown) */
async function fetchAllRoles(supabase: any): Promise<string[]> {
  const { data } = await supabase.from("calloff_imports").select("role").limit(2000);
  const roles = new Set<string>();
  for (const r of (data || [])) {
    if (r.role) roles.add(r.role);
  }
  return [...roles].sort();
}

function mapRoleToProfession(roll: string): string | null {
  if (!roll) return null;
  const r = roll.toLowerCase();
  if (r === "doctor" || r === "nurse" || r === "physiotherapist") return roll.toUpperCase();
  if (r.includes("läkare") || r.includes("lakare")) return "DOCTOR";
  if (r.includes("sjuksköt") || r.includes("sjukskot") || r.includes("barnmorska")) return "NURSE";
  if (r.includes("fysioterapeut") || r.includes("sjukgymnast")) return "PHYSIOTHERAPIST";
  return null;
}

/** Hämta senaste avropsdatum + medianpris per region för en roll (för UI-kontext) */
async function fetchRegionContext(
  supabase: any,
  roll: string,
): Promise<Map<string, { lastDate: string; lastCustomer: string; medianPrice: number | null; histCount: number }>> {
  const { data } = await supabase
    .from("calloff_imports")
    .select("customer, region, calloff_date, price_median")
    .eq("role", roll)
    .order("calloff_date", { ascending: false })
    .limit(MAX_TOTAL_ROWS);

  if ((data?.length ?? 0) >= MAX_TOTAL_ROWS) {
    console.warn(
      `[get-avrop-predictions] MAX_TOTAL_ROWS (${MAX_TOTAL_ROWS}) hit for role "${roll}" — truncating`,
    );
  }

  const map = new Map<string, { lastDate: string; lastCustomer: string; medianPrice: number | null; histCount: number }>();
  const pricesByRegion = new Map<string, number[]>();

  for (const r of (data || [])) {
    if (!r.region || !r.calloff_date) continue;
    if (!map.has(r.region)) {
      map.set(r.region, {
        lastDate: r.calloff_date,
        lastCustomer: r.customer || "Okänd",
        medianPrice: null,
        histCount: 0,
      });
    }
    const ctx = map.get(r.region)!;
    ctx.histCount += 1;
    if (r.price_median != null) {
      if (!pricesByRegion.has(r.region)) pricesByRegion.set(r.region, []);
      pricesByRegion.get(r.region)!.push(r.price_median);
    }
  }

  for (const [region, prices] of pricesByRegion) {
    prices.sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    map.get(region)!.medianPrice = median;
  }

  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUserAuth(req, { corsHeaders });
  if (!auth.ok) return auth.response;
  const { user, service: supabase, ip, ua } = auth.ctx;

  const url = new URL(req.url);
  const roll = (url.searchParams.get("roll") || "").slice(0, 200);

  const rl = await enforceUserRateLimit(supabase, user, "get-avrop-predictions", {
    ip, ua, limitPerHour: RATE_LIMIT_PER_HOUR, corsHeaders,
    filters: { roll },
  });
  if (rl) return rl;

  try {
    // Endast roll-listning
    if (!roll || roll === "__all_roles__") {
      const roller = await fetchAllRoles(supabase);
      await supabase.from("radar_access_log").insert({
        user_id: user.id,
        endpoint: "get-avrop-predictions",
        filters: { roll: roll || null, mode: "roles_only" },
        row_count: roller.length,
        client_ip: ip,
        user_agent: ua.slice(0, 200),
        status: "success",
      }).then(() => {}, () => {});
      return new Response(JSON.stringify({ predictions: [], roller }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Hämta förberäknade prognoser för rollen från senaste forecast_run
    const today = new Date();
    const currentYM = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;

    const { data: latestRun } = await supabase
      .from("uppdragsradar_predictions")
      .select("forecast_run_id, generated_at")
      .order("generated_at", { ascending: false })
      .limit(1);

    const runId = latestRun?.[0]?.forecast_run_id;
    const profession = mapRoleToProfession(roll);

    let forecasts: ForecastRow[] = [];
    if (runId && profession) {
      const { data } = await supabase
        .from("uppdragsradar_predictions")
        .select(
          "customer, region, profession, specialization, month, expected_calloffs, seasonal_index, yoy_ratio, confidence, is_seasonal_peak, is_trend_break, is_under_review, generated_at",
        )
        .eq("forecast_run_id", runId)
        .eq("profession", profession)
        .gte("month", currentYM)
        .in("confidence", ["med", "high"])
        .order("month", { ascending: true })
        .limit(MAX_TOTAL_ROWS);
      forecasts = (data || []) as ForecastRow[];
    }

    // 2. Om vi har förberäknade prognoser → använd dem
    if (forecasts.length > 0) {
      const ctxMap = await fetchRegionContext(supabase, roll);

      const regionAgg = new Map<string, {
        totalExpected: number;
        topCustomer: string;
        topCustomerExpected: number;
        nextMonth: string;
        nextMonthExpected: number;
        anyPeak: boolean;
        anyBreak: boolean;
        anyUnderReview: boolean;
        bestConfidence: "low" | "med" | "high";
      }>();

      const confRank = { low: 0, med: 1, high: 2 } as const;

      for (const f of forecasts) {
        if (!f.region) continue;
        const cur = regionAgg.get(f.region) ?? {
          totalExpected: 0,
          topCustomer: f.customer,
          topCustomerExpected: 0,
          nextMonth: f.month,
          nextMonthExpected: 0,
          anyPeak: false,
          anyBreak: false,
          anyUnderReview: false,
          bestConfidence: "low" as "low" | "med" | "high",
        };
        cur.totalExpected += f.expected_calloffs;
        if (f.expected_calloffs > cur.topCustomerExpected) {
          cur.topCustomer = f.customer;
          cur.topCustomerExpected = f.expected_calloffs;
        }
        if (f.month < cur.nextMonth || cur.nextMonthExpected === 0) {
          cur.nextMonth = f.month;
          cur.nextMonthExpected = f.expected_calloffs;
        } else if (f.month === cur.nextMonth) {
          cur.nextMonthExpected += f.expected_calloffs;
        }
        if (f.is_seasonal_peak) cur.anyPeak = true;
        if (f.is_trend_break) cur.anyBreak = true;
        if (f.is_under_review) cur.anyUnderReview = true;
        const cConf = (f.confidence ?? "low") as "low" | "med" | "high";
        if (confRank[cConf] > confRank[cur.bestConfidence]) cur.bestConfidence = cConf;
        regionAgg.set(f.region, cur);
      }

      const predictions: RegionPrediction[] = [];
      const todayMs = today.getTime();

      for (const [region, agg] of regionAgg) {
        const ctx = ctxMap.get(region);
        const avgInterval = agg.totalExpected > 0
          ? Math.max(1, Math.round(180 / agg.totalExpected))
          : 30;

        const baseDate = ctx?.lastDate ? new Date(ctx.lastDate) : today;
        const predictedNextMs = Math.max(
          baseDate.getTime() + avgInterval * 86400 * 1000,
          todayMs,
        );
        const predictedNext = new Date(predictedNextMs);
        const daysLeft = Math.max(
          0,
          Math.round((predictedNextMs - todayMs) / (86400 * 1000)),
        );

        predictions.push({
          region_namn: region,
          senaste_uppdrag_datum: ctx?.lastDate ?? today.toISOString().split("T")[0],
          snitt_dagar_mellan_uppdrag: avgInterval,
          predikterat_nasta_datum: predictedNext.toISOString().split("T")[0],
          antal_historiska_uppdrag: ctx?.histCount ?? 0,
          dagar_kvar: daysLeft,
          senaste_kund: agg.topCustomer || ctx?.lastCustomer || "Okänd",
          medianpris: ctx?.medianPrice ?? null,
          expected_calloffs: Math.round(agg.totalExpected * 10) / 10,
          confidence: agg.bestConfidence,
          is_seasonal_peak: agg.anyPeak,
          is_trend_break: agg.anyBreak,
          is_under_review: agg.anyUnderReview,
        });
      }

      predictions.sort((a, b) => a.dagar_kvar - b.dagar_kvar);
      const roller = await fetchAllRoles(supabase);
      const generatedAt = forecasts[0]?.generated_at ?? null;

      await supabase.from("radar_access_log").insert({
        user_id: user.id,
        endpoint: "get-avrop-predictions",
        filters: { roll, source: "precomputed" },
        row_count: predictions.length,
        client_ip: ip,
        user_agent: ua.slice(0, 200),
        status: "success",
      }).then(() => {}, () => {});

      return new Response(
        JSON.stringify({
          predictions,
          roller,
          source: "precomputed",
          forecast_generated_at: generatedAt,
          forecast_age_days: generatedAt
            ? Math.round((todayMs - new Date(generatedAt).getTime()) / (86400 * 1000))
            : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Fallback: gamla realtidsmotorn när ingen prognos finns för rollen
    const { data: rawRows } = await supabase
      .from("calloff_imports")
      .select("customer, role, specialization, calloff_date, region, filled, price_median")
      .eq("role", roll)
      .order("calloff_date", { ascending: false })
      .limit(MAX_TOTAL_ROWS);

    if ((rawRows?.length ?? 0) >= MAX_TOTAL_ROWS) {
      console.warn(
        `[get-avrop-predictions] MAX_TOTAL_ROWS (${MAX_TOTAL_ROWS}) hit for fallback path, role "${roll}"`,
      );
    }

    const allRows: UnifiedRow[] = (rawRows || [])
      .map((r: any) => ({
        customer: r.customer || "Okänd",
        role: r.role,
        specialization: r.specialization,
        created_at: r.calloff_date,
        region: r.region,
        filled: r.filled ?? false,
        price_median: r.price_median,
      }))
      .filter((r) => r.region && r.created_at);

    const todayMs = today.getTime();
    const groups = new Map<string, UnifiedRow[]>();
    for (const row of allRows) {
      if (!groups.has(row.region)) groups.set(row.region, []);
      groups.get(row.region)!.push(row);
    }

    const predictions: RegionPrediction[] = [];

    for (const [regionNamn, reqs] of groups) {
      if (reqs.length < 3) continue;
      reqs.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
        intervals.reduce((a, b) => a + b, 0) / intervals.length,
      );

      const lastDate = new Date(reqs[0].created_at);
      const predictedNextMs = lastDate.getTime() + avgInterval * 86400 * 1000;
      const predictedNext = new Date(predictedNextMs);
      const daysLeft = Math.round((predictedNextMs - todayMs) / (86400 * 1000));

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

    await supabase.from("radar_access_log").insert({
      user_id: user.id,
      endpoint: "get-avrop-predictions",
      filters: { roll, source: "realtime_fallback" },
      row_count: predictions.length,
      client_ip: ip,
      user_agent: ua.slice(0, 200),
      status: "success",
    }).then(() => {}, () => {});

    return new Response(
      JSON.stringify({ predictions, roller, source: "realtime_fallback" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[get-avrop-predictions] error:", msg);
    await supabase.from("radar_access_log").insert({
      user_id: user.id,
      endpoint: "get-avrop-predictions",
      filters: { roll },
      row_count: 0,
      client_ip: ip,
      user_agent: ua.slice(0, 200),
      status: "error",
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
