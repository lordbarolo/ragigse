import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_NORMALIZE: Record<string, string> = {
  "Distriktssköterska": "Distriktssjuksköterska",
  "Övrig": "",
  "Sjukgymnast": "Fysioterapeut",
  "Mentalskötare": "Mentalskötare",
  "Undersköterska": "Undersköterska",
};

function normalizeRole(role: string): string {
  if (ROLE_NORMALIZE.hasOwnProperty(role)) return ROLE_NORMALIZE[role];
  return role;
}

const SWEDISH_MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

interface UnifiedRow {
  buyer: string;
  competence: string;
  location: string;
  zon: string;
  duration_weeks: number | null;
  calloff_date: string;
  unit: string; // deduplication sub-key (e.g. hospital ward)
}

interface MergedPeriod {
  start: number; // ms
  end: number;   // ms
  count: number; // how many raw rows merged into this period
}

const DAY_MS = 86400000;
const MERGE_GAP_DAYS = 14; // periods within 14 days are considered adjacent

/**
 * Merge overlapping or adjacent time periods for the same group.
 * Each raw row becomes a period: [calloff_date, calloff_date + duration].
 * Periods within MERGE_GAP_DAYS of each other are merged into one.
 * Returns merged periods sorted by start date descending.
 */
function deduplicatePeriods(rows: UnifiedRow[]): MergedPeriod[] {
  // Group by unit — different units represent genuinely different needs
  const unitGroups = new Map<string, UnifiedRow[]>();
  for (const r of rows) {
    const u = r.unit || "__no_unit__";
    if (!unitGroups.has(u)) unitGroups.set(u, []);
    unitGroups.get(u)!.push(r);
  }

  const allMerged: MergedPeriod[] = [];

  // Within each unit, merge overlapping/adjacent periods
  for (const [, unitRows] of unitGroups) {
    const periods: { start: number; end: number }[] = unitRows.map(r => {
      const start = new Date(r.calloff_date).getTime();
      const durationMs = (r.duration_weeks || 4) * 7 * DAY_MS;
      return { start, end: start + durationMs };
    });

    periods.sort((a, b) => a.start - b.start);

    const unitMerged: MergedPeriod[] = [];
    for (const p of periods) {
      if (unitMerged.length === 0) {
        unitMerged.push({ start: p.start, end: p.end, count: 1 });
      } else {
        const last = unitMerged[unitMerged.length - 1];
        if (p.start <= last.end + MERGE_GAP_DAYS * DAY_MS) {
          last.end = Math.max(last.end, p.end);
          last.count += 1;
        } else {
          unitMerged.push({ start: p.start, end: p.end, count: 1 });
        }
      }
    }
    allMerged.push(...unitMerged);
  }

  allMerged.sort((a, b) => b.start - a.start);
  return allMerged;
}

/** Paginated fetch — fetches all rows from a Supabase query in 1000-row batches */
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
    const url = new URL(req.url);
    const competenceFilter = url.searchParams.get("competence") || "";
    const locationFilter = url.searchParams.get("location") || "";
    const buyerFilter = url.searchParams.get("buyer") || "";
    const page = parseInt(url.searchParams.get("page") || "0");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const applyFilters = (competenceCol: string, locationCol: string, buyerCol: string, hasCustType: boolean) => (q: any) => {
      if (competenceFilter) q = q.eq(competenceCol, competenceFilter);
      if (locationFilter) q = q.eq(locationCol, locationFilter);
      if (buyerFilter) {
        if (buyerFilter === "Privat" && hasCustType) {
          q = q.eq("customer_type", "Privat");
        } else {
          q = q.eq(buyerCol, buyerFilter);
        }
      }
      return q;
    };

    const [historyRows, importRows, requestRows] = await Promise.all([
      fetchAll(supabase, "calloff_history",
        "buyer, yrkeskategori, zon, location, duration_weeks, calloff_date",
        applyFilters("yrkeskategori", "location", "buyer", false),
        "calloff_date"),
      fetchAll(supabase, "calloff_imports",
        "customer, role, region, calloff_date, duration_weeks, customer_type, unit",
        (q: any) => {
          q = q.not("calloff_date", "is", null).not("customer", "is", null).not("role", "is", null);
          return applyFilters("role", "region", "customer", true)(q);
        },
        "calloff_date"),
      fetchAll(supabase, "requests",
        "customer, role, region, created_at, customer_type, unit",
        (q: any) => {
          q = q.not("created_at", "is", null).not("customer", "is", null).not("role", "is", null);
          return applyFilters("role", "region", "customer", true)(q);
        },
        "created_at"),
    ]);

    // Normalize into UnifiedRow[]
    const unified: UnifiedRow[] = [];

    for (const r of historyRows) {
      unified.push({
        buyer: r.buyer, competence: r.yrkeskategori, location: r.location,
        zon: r.zon, duration_weeks: r.duration_weeks, calloff_date: r.calloff_date,
      });
    }

    for (const r of importRows) {
      unified.push({
        buyer: r.customer_type === "Privat" ? "Privat" : r.customer,
        competence: r.role, location: r.region || "Okänd",
        zon: "", duration_weeks: r.duration_weeks, calloff_date: r.calloff_date,
      });
    }

    for (const r of requestRows) {
      const normalized = normalizeRole(r.role);
      if (!normalized) continue;
      unified.push({
        buyer: r.customer_type === "Privat" ? "Privat" : r.customer,
        competence: normalized, location: r.region || "Okänd",
        zon: "", duration_weeks: null, calloff_date: r.created_at,
      });
    }

    const today = new Date();
    const todayMs = today.getTime();
    const currentMonth = today.getMonth();
    const nextMonth = (currentMonth + 1) % 12;
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Group by buyer + competence + location
    const groups = new Map<string, UnifiedRow[]>();
    for (const row of unified) {
      const key = `${row.buyer}|${row.competence}|${row.location}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const predictions: any[] = [];

    for (const [key, calloffs] of groups) {
      const [buyer, competence, location] = key.split("|");

      // --- Period-based deduplication ---
      const mergedPeriods = deduplicatePeriods(calloffs);
      const count = mergedPeriods.length; // deduplicated count
      if (count < 2) continue;

      // Compute intervals between deduplicated periods (using start dates)
      const intervals: number[] = [];
      for (let i = 0; i < mergedPeriods.length - 1; i++) {
        const diff = Math.round((mergedPeriods[i].start - mergedPeriods[i + 1].start) / DAY_MS);
        intervals.push(diff);
      }
      const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);

      const lastDate = new Date(mergedPeriods[0].start);
      const oldestDate = new Date(mergedPeriods[mergedPeriods.length - 1].start);
      const daysSinceLast = Math.round((todayMs - lastDate.getTime()) / DAY_MS);
      const monthsSinceLast = daysSinceLast / 30.44;
      const spanMonths = Math.max(1, Math.round((todayMs - oldestDate.getTime()) / (DAY_MS * 30.44)));

      // --- Predicted next date ---
      const predictedNextMs = lastDate.getTime() + avgInterval * DAY_MS;
      const predictedDate = new Date(predictedNextMs).toISOString().split("T")[0];

      // --- Spåkulor (1-3) probability system ---
      const hasOneYearHistory = spanMonths >= 12;
      
      // Check for recurring pattern: same month across ≥2 years (using deduplicated periods)
      const monthYearMap = new Map<number, Set<number>>();
      for (const p of mergedPeriods) {
        const d = new Date(p.start);
        const m = d.getMonth();
        if (!monthYearMap.has(m)) monthYearMap.set(m, new Set());
        monthYearMap.get(m)!.add(d.getFullYear());
      }
      const hasRecurringPattern = [...monthYearMap.values()].some(years => years.size >= 2);

      // Recent activity (last 3 months) — using deduplicated periods
      const recentCount = mergedPeriods.filter(p => p.start >= threeMonthsAgo.getTime()).length;
      const hasRecentActivity = recentCount > 0;

      let probabilityLevel: 1 | 2 | 3;
      if (hasRecurringPattern && count >= 3 && hasRecentActivity) {
        probabilityLevel = 3;
      } else if (hasRecurringPattern) {
        probabilityLevel = 2;
      } else if (hasOneYearHistory) {
        probabilityLevel = 1;
      } else {
        probabilityLevel = 1;
      }

      // --- Seasonal signal (using deduplicated periods) ---
      const seasonalMatches = mergedPeriods.filter(p => {
        const m = new Date(p.start).getMonth();
        return m === currentMonth || m === nextMonth;
      });
      const seasonalYears = new Set(seasonalMatches.map(p => new Date(p.start).getFullYear())).size;
      let seasonalSignal: string | null = null;
      if (seasonalMatches.length >= 2 && seasonalYears >= 2) {
        const monthName = SWEDISH_MONTHS[currentMonth];
        seasonalSignal = `Avrop i ${monthName} ${seasonalYears} av senaste åren — sannolikt återkommande`;
      }

      // --- Status from ratio ---
      let maxStatus: "high" | "medium" | "watch";
      if (monthsSinceLast > 24) maxStatus = "watch";
      else if (monthsSinceLast > 12) maxStatus = "medium";
      else maxStatus = "high";

      const ratio = daysSinceLast / avgInterval;
      let status: "high" | "medium" | "watch";
      if (ratio >= 0.8) status = "high";
      else if (ratio >= 0.5) status = "medium";
      else status = "watch";

      // Seasonal boost
      if (seasonalMatches.length >= 2 && seasonalYears >= 2 && monthsSinceLast <= 24) {
        if (status === "watch") status = "medium";
        else if (status === "medium") status = "high";
      }

      const statusOrder = { watch: 0, medium: 1, high: 2 };
      if (statusOrder[status] > statusOrder[maxStatus]) status = maxStatus;

      const timespanLabel = spanMonths >= 24
        ? `senaste ${Math.round(spanMonths / 12)} åren`
        : `senaste ${spanMonths} månaderna`;

      let forecastWindow: string;
      if (ratio >= 0.8) {
        const weeksLeft = Math.max(1, Math.round((avgInterval - daysSinceLast) / 7));
        forecastWindow = weeksLeft <= 1 ? "Sannolikt inom 1 vecka" : `Sannolikt inom ${weeksLeft}–${weeksLeft + 2} veckor`;
      } else if (ratio >= 0.5) {
        const weeksUntil = Math.round((avgInterval * 0.8 - daysSinceLast) / 7);
        forecastWindow = `Möjligt inom ${Math.max(2, weeksUntil)}–${Math.max(4, weeksUntil + 2)} veckor`;
      } else {
        const weeksUntil = Math.round((avgInterval * 0.8 - daysSinceLast) / 7);
        forecastWindow = `Bevaka kommande ${Math.max(4, weeksUntil)}–${Math.max(6, weeksUntil + 2)} veckor`;
      }

      // Count raw rows for context
      const rawCount = calloffs.length;

      const reasons: string[] = [
        `${count} unika uppdragsperioder ${timespanLabel} hos ${buyer}${rawCount > count ? ` (${rawCount} rader sammanslagna)` : ""}`,
        `Genomsnittligt intervall: ${avgInterval} dagar`,
        `Senaste uppdraget var ${daysSinceLast} dagar sedan`,
      ];
      if (seasonalSignal) reasons.push(seasonalSignal);
      if (monthsSinceLast > 24) reasons.push("Inget uppdrag senaste 24 månaderna – lägre sannolikhet");
      else if (monthsSinceLast > 12) reasons.push("Inget uppdrag senaste 12 månaderna – avvaktande");

      // History from deduplicated periods
      const history = mergedPeriods.slice(0, 10).map(p => {
        const startDate = new Date(p.start).toISOString().split("T")[0];
        const durationWeeks = Math.round((p.end - p.start) / (7 * DAY_MS));
        return {
          date: startDate,
          description: `Uppdrag ${competence.toLowerCase()}, ${durationWeeks || "?"} veckor${p.count > 1 ? ` (${p.count} sammanslagna)` : ""}`,
        };
      });

      predictions.push({
        id: `pred-${buyer.replace(/\s/g, "")}-${competence.replace(/\s/g, "")}-${location.replace(/\s/g, "")}`,
        buyer, competence, location, status,
        probabilityLevel, seasonalSignal, predictedDate,
        forecastWindow,
        historicalSignal: `${count} unika uppdragsperioder ${timespanLabel}`,
        lastActivity: `Senaste uppdrag: ${daysSinceLast} dagar sedan`,
        calloffCount: count, avgIntervalDays: avgInterval,
        rawCalloffCount: rawCount,
        summary: `${competence} hos ${buyer} har haft ${count} unika uppdragsperioder med ett genomsnittligt intervall på ${avgInterval} dagar (${timespanLabel}).`,
        reasons, history,
      });
    }

    // Sort by probability level desc, then status
    const sortOrder = { high: 0, medium: 1, watch: 2 };
    predictions.sort((a, b) => {
      if (b.probabilityLevel !== a.probabilityLevel) return b.probabilityLevel - a.probabilityLevel;
      return sortOrder[a.status as keyof typeof sortOrder] - sortOrder[b.status as keyof typeof sortOrder];
    });

    // Paginate
    const total = predictions.length;
    const paged = predictions.slice(page * pageSize, (page + 1) * pageSize);

    const filters = {
      competences: [...new Set(unified.map(r => r.competence))].sort(),
      locations: [...new Set(unified.map(r => r.location))].sort(),
      buyers: [...new Set(unified.map(r => r.buyer))].sort(),
    };

    return new Response(JSON.stringify({ predictions: paged, total, filters }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
