/**
 * home-assistant — publik endpoint för startsidans assistent.
 *
 * Kontrakt: klienten skickar ett fråge-ID, aldrig en prompt. Funktionen
 * returnerar färdig svarstext. Ingen LLM anropas här — svaret byggs
 * deterministiskt ur avropshistoriken, vilket gör det cachebart och gratis.
 *
 * Läser med service-role eftersom RLS på `calloff_history` inte är avsedd för
 * anon-läsning; en RLS-filtrerad läsning skulle returnera tom mängd utan fel.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { withErrorLogging } from "../_shared/withErrorLogging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

const RECENT_WINDOW_DAYS = 30;
/** Generöst tak — svaret är en ren DB-aggregering utan modellkostnad. */
const MAX_REQUESTS_PER_HOUR = 60;

interface CalloffRow {
  buyer: string;
  calloff_date: string;
  location: string;
  yrkeskategori: string;
  zon: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

/** "3 mars 2026" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Räknar förekomster och returnerar de vanligaste som "Namn (n)". */
function topCounts(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, n]) => `${name} (${n})`);
}

async function answerRecentCalloffs(
  supabase: ReturnType<typeof createClient>
): Promise<{ paragraphs: string[]; source: string }> {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("calloff_history")
    .select("buyer, calloff_date, location, yrkeskategori, zon")
    .gte("calloff_date", since)
    .order("calloff_date", { ascending: false });

  if (error) throw new Error(`calloff_history: ${error.message}`);

  const rows = (data ?? []) as CalloffRow[];

  // Inga avrop i fönstret — var transparent om vad som faktiskt finns
  // i stället för att visa ett tomt svar som ser ut som ett fel.
  if (rows.length === 0) {
    const { data: latest, error: latestError } = await supabase
      .from("calloff_history")
      .select("calloff_date")
      .order("calloff_date", { ascending: false })
      .limit(1);

    if (latestError) throw new Error(`calloff_history: ${latestError.message}`);

    const latestDate = (latest ?? [])[0]?.calloff_date as string | undefined;

    if (!latestDate) {
      return {
        paragraphs: [
          "Jag har ingen registrerad avropsdata att utgå från ännu. Så snart avrop importeras kan jag visa hur efterfrågan rör sig per roll och zon.",
        ],
        source: "Avropsdata · inga poster registrerade",
      };
    }

    return {
      paragraphs: [
        `Inga avrop finns registrerade de senaste ${RECENT_WINDOW_DAYS} dagarna. Det senaste registrerade avropet är från ${formatDate(latestDate)}.`,
        "Avropsdatan bygger på publicerade avrop som importerats i efterhand — den är alltså historik, inte en live-bevakning.",
      ],
      source: `Avropsdata · senaste post ${formatDate(latestDate)}`,
    };
  }

  const roles = topCounts(rows.map((r) => r.yrkeskategori), 3);
  const buyers = topCounts(rows.map((r) => r.buyer), 3);
  const zones = topCounts(rows.map((r) => r.zon), 3);

  return {
    paragraphs: [
      `Utifrån tillgänglig avropsdata ser jag ${rows.length} avrop de senaste ${RECENT_WINDOW_DAYS} dagarna. Vanligaste rollerna: ${roles.join(", ")}.`,
      `Mest aktiva köpare: ${buyers.join(", ")}. Fördelningen per zon: ${zones.join(", ")}.`,
      "Siffrorna bygger på publicerade avrop som importerats i efterhand — det är historik, inte en live-bevakning av upphandlingar.",
    ],
    source: `Avropsdata · ${rows.length} avrop, senaste ${RECENT_WINDOW_DAYS} dagarna`,
  };
}

Deno.serve(
  withErrorLogging("home-assistant", async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("cf-connecting-ip") ??
      "unknown";

    const rate = await checkRateLimit(
      supabase,
      "home-assistant",
      clientIp,
      MAX_REQUESTS_PER_HOUR
    );
    if (!rate.allowed) return rateLimitResponse(rate, corsHeaders);

    let body: { question_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (body.question_id !== "recent_calloffs") {
      // Endast avropsfrågan besvaras server-side. Pris- och zonfrågor löses
      // deterministiskt i klienten mot publika ramavtalstabeller.
      return json({ error: "Unknown question_id" }, 400);
    }

    const answer = await answerRecentCalloffs(supabase);
    return json(answer);
  })
);
