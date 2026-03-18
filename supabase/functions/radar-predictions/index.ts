import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize role names from requests table to match CompCare survey taxonomy
const ROLE_NORMALIZE: Record<string, string> = {
  "Distriktssköterska": "Distriktssjuksköterska",
  "Övrig": "", // exclude — too generic to map
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

/** Format a timespan in months into a human-readable Swedish string */
function formatTimespan(months: number): string {
  if (months >= 24) {
    const years = Math.round(months / 12);
    return `senaste ${years} åren`;
  }
  return `senaste ${months} månaderna`;
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

    // Build queries for all three tables in parallel
    let historyQuery = supabase
      .from("calloff_history")
      .select("buyer, yrkeskategori, zon, location, duration_weeks, calloff_date")
      .order("calloff_date", { ascending: false });

    let importsQuery = supabase
      .from("calloff_imports")
      .select("customer, role, region, calloff_date, duration_weeks, customer_type")
      .not("calloff_date", "is", null)
      .not("customer", "is", null)
      .not("role", "is", null)
      .order("calloff_date", { ascending: false });

    let requestsQuery = supabase
      .from("requests")
      .select("customer, role, region, created_at")
      .not("created_at", "is", null)
      .not("customer", "is", null)
      .not("role", "is", null)
      .order("created_at", { ascending: false });

    if (competenceFilter) {
      historyQuery = historyQuery.eq("yrkeskategori", competenceFilter);
      importsQuery = importsQuery.eq("role", competenceFilter);
      requestsQuery = requestsQuery.eq("role", competenceFilter);
    }
    if (locationFilter) {
      historyQuery = historyQuery.eq("location", locationFilter);
      importsQuery = importsQuery.eq("region", locationFilter);
      requestsQuery = requestsQuery.eq("region", locationFilter);
    }
    if (buyerFilter) {
      historyQuery = historyQuery.eq("buyer", buyerFilter);
      importsQuery = importsQuery.eq("customer", buyerFilter);
      requestsQuery = requestsQuery.eq("customer", buyerFilter);
    }

    const [{ data: historyRows, error: e1 }, { data: importRows, error: e2 }, { data: requestRows, error: e3 }] =
      await Promise.all([historyQuery, importsQuery, requestsQuery]);

    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;

    // Normalize all three sources into UnifiedRow[]
    const unified: UnifiedRow[] = [];

    for (const r of (historyRows || []) as any[]) {
      unified.push({
        buyer: r.buyer,
        competence: r.yrkeskategori,
        location: r.location,
        zon: r.zon,
        duration_weeks: r.duration_weeks,
        calloff_date: r.calloff_date,
      });
    }

    for (const r of (importRows || []) as any[]) {
      unified.push({
        buyer: r.customer,
        competence: r.role,
        location: r.region || "Okänd",
        zon: "",
        duration_weeks: r.duration_weeks,
        calloff_date: r.calloff_date,
      });
    }

    for (const r of (requestRows || []) as any[]) {
      const normalized = normalizeRole(r.role);
      if (!normalized) continue; // skip unmappable roles like "Övrig"
      unified.push({
        buyer: r.customer,
        competence: normalized,
        location: r.region || "Okänd",
        zon: "",
        duration_weeks: null,
        calloff_date: r.created_at,
      });
    }

    const today = new Date();
    const todayMs = today.getTime();
    const currentMonth = today.getMonth(); // 0-indexed
    const nextMonth = (currentMonth + 1) % 12;

    // Group by buyer + competence + location
    const groups = new Map<string, UnifiedRow[]>();
    for (const row of unified) {
      const key = `${row.buyer}|${row.competence}|${row.location}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const predictions: Prediction[] = [];

    for (const [key, calloffs] of groups) {
      const [buyer, competence, location] = key.split("|");
      calloffs.sort(
        (a, b) =>
          new Date(b.calloff_date).getTime() -
          new Date(a.calloff_date).getTime()
      );

      const count = calloffs.length;
      if (count < 2) continue;

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
      const oldestDate = new Date(calloffs[calloffs.length - 1].calloff_date);
      const daysSinceLast = Math.round(
        (todayMs - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // --- Dynamic timespan ---
      const spanMonths = Math.max(1, Math.round(
        (todayMs - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      ));
      const timespanLabel = formatTimespan(spanMonths);

      // --- Recency gate ---
      // Caps maximum status based on how recently the last activity was
      const monthsSinceLast = daysSinceLast / 30.44;
      let maxStatus: "high" | "medium" | "watch";
      if (monthsSinceLast > 24) {
        maxStatus = "watch";
      } else if (monthsSinceLast > 12) {
        maxStatus = "medium";
      } else {
        maxStatus = "high";
      }

      // --- Base status from ratio ---
      const ratio = daysSinceLast / avgInterval;
      let status: "high" | "medium" | "watch";
      let forecastWindow: string;

      if (ratio >= 0.8) {
        status = "high";
        const weeksLeft = Math.max(1, Math.round((avgInterval - daysSinceLast) / 7));
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

      // --- Seasonal signal boost ---
      // Count how many historical calloffs fall in the current or next month
      const seasonalMatches = calloffs.filter((c) => {
        const m = new Date(c.calloff_date).getMonth();
        return m === currentMonth || m === nextMonth;
      }).length;

      // Count distinct years for seasonal context
      const seasonalYears = new Set(
        calloffs
          .filter((c) => {
            const m = new Date(c.calloff_date).getMonth();
            return m === currentMonth || m === nextMonth;
          })
          .map((c) => new Date(c.calloff_date).getFullYear())
      ).size;

      const totalYearsSpan = Math.max(1, Math.ceil(spanMonths / 12));

      // Boost: ≥2 seasonal matches in distinct years AND last activity < 24 months
      if (seasonalMatches >= 2 && seasonalYears >= 2 && monthsSinceLast <= 24) {
        if (status === "watch") status = "medium";
        else if (status === "medium") status = "high";
      }

      // --- Apply recency gate (cap status) ---
      const statusOrder = { watch: 0, medium: 1, high: 2 };
      if (statusOrder[status] > statusOrder[maxStatus]) {
        status = maxStatus;
      }

      // --- Build reasons with dynamic copy ---
      const reasons: string[] = [
        `${count} uppdrag ${timespanLabel} hos ${buyer}`,
        `Genomsnittligt intervall: ${avgInterval} dagar`,
        `Senaste uppdraget var ${daysSinceLast} dagar sedan`,
      ];

      if (ratio >= 0.9 && maxStatus === "high") {
        reasons.push("Nästa uppdragsfönster har sannolikt redan öppnat");
      }

      if (monthsSinceLast > 24) {
        reasons.push("Inget uppdrag senaste 24 månaderna – lägre sannolikhet");
      } else if (monthsSinceLast > 12) {
        reasons.push("Inget uppdrag senaste 12 månaderna – avvaktande");
      }

      // Seasonal reason
      if (seasonalMatches >= 2 && seasonalYears >= 2) {
        const monthName = SWEDISH_MONTHS[currentMonth];
        reasons.push(
          `Historiskt mönster: uppdrag i ${monthName} ${seasonalYears} av ${totalYearsSpan} år`
        );
      }

      const history = calloffs.map((c) => ({
        date: c.calloff_date,
        description: `Uppdrag ${competence.toLowerCase()}, ${c.duration_weeks || "?"} veckor`,
      }));

      predictions.push({
        id: `pred-${buyer.replace(/\s/g, "")}-${competence.replace(/\s/g, "")}`,
        buyer,
        competence,
        location,
        status,
        forecastWindow,
        historicalSignal: `${count} liknande uppdrag ${timespanLabel}`,
        lastActivity: `Senaste uppdrag: ${daysSinceLast} dagar sedan`,
        calloffCount: count,
        avgIntervalDays: avgInterval,
        summary: `${competence} hos ${buyer} har haft ${count} uppdrag med ett genomsnittligt intervall på ${avgInterval} dagar (${timespanLabel}).`,
        reasons,
        history,
      });
    }

    // Sort: high first, then medium, then watch
    const sortOrder = { high: 0, medium: 1, watch: 2 };
    predictions.sort((a, b) => {
      if (sortOrder[a.status] !== sortOrder[b.status])
        return sortOrder[a.status] - sortOrder[b.status];
      const ratioA =
        parseInt(a.lastActivity.match(/(\d+)/)?.[1] || "0") / a.avgIntervalDays;
      const ratioB =
        parseInt(b.lastActivity.match(/(\d+)/)?.[1] || "0") / b.avgIntervalDays;
      return ratioB - ratioA;
    });

    // Return distinct filter values from merged data
    const filters = {
      competences: [...new Set(unified.map((r) => r.competence))].sort(),
      locations: [...new Set(unified.map((r) => r.location))].sort(),
      buyers: [...new Set(unified.map((r) => r.buyer))].sort(),
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
