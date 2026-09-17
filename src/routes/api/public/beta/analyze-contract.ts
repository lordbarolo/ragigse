import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isRateLimited } from "@/lib/beta/rateLimit";
import { calculate, type CompensationType } from "@/lib/beta/calc";
import {
  BETA_MODEL,
  BetaAiError,
  extractContract,
  generateCounterOffers,
  type ExtractedContract,
} from "@/lib/beta/ai";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const DAILY_LIMIT = 10;
const DEFAULT_BENCHMARK: Record<string, number> = { Läkare: 1400, Sjuksköterska: 780 };
const COMPENSATION_TYPES: CompensationType[] = ["AB", "Faktura", "Anställd", "Okänt"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logAiUsage(
  supabase: SupabaseClient,
  feature: string,
  usage: Record<string, number>,
) {
  const { error } = await supabase.from("ai_usage_logs").insert({
    user_id: null,
    feature,
    model: BETA_MODEL,
    input_tokens: usage["prompt_tokens"] ?? 0,
    output_tokens: usage["completion_tokens"] ?? 0,
    total_tokens: usage["total_tokens"] ?? null,
    metadata: { beta: true },
  });
  if (error) console.error("beta-analyze-contract: kunde inte logga AI-användning", error.message);
}

export const Route = createFileRoute("/api/public/beta/analyze-contract")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false } },
        );

        try {
          if (!apiKey) {
            console.error("beta-analyze-contract: LOVABLE_API_KEY saknas");
            return json({ error: "AI-analysen är inte konfigurerad" }, 502);
          }

          const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!body || typeof body !== "object") return json({ error: "Ogiltig förfrågan" }, 400);

          const text = typeof body["text"] === "string" ? body["text"] : undefined;
          const fileBase64 =
            typeof body["file_base64"] === "string" ? body["file_base64"] : undefined;
          const mimeType = typeof body["mime_type"] === "string" ? body["mime_type"] : undefined;
          const tone = body["tone"] === "sharp" ? "sharp" : "soft";

          if (!text?.trim() && !fileBase64) {
            return json({ error: "Skicka in text eller en fil att analysera" }, 400);
          }
          if (fileBase64) {
            if (!mimeType || !ALLOWED_MIME.includes(mimeType)) {
              return json({ error: "Filtypen stöds inte" }, 400);
            }
            const bytes = Math.floor((fileBase64.length * 3) / 4);
            if (bytes > MAX_FILE_BYTES) {
              return json({ error: "Filen är för stor. Max 10 MB." }, 413);
            }
          }

          if (await isRateLimited(supabase, request, "analyze", DAILY_LIMIT)) {
            return json(
              {
                error:
                  "Du har använt dina 10 analyser för det här dygnet. Välkommen tillbaka i morgon.",
              },
              429,
            );
          }

          // 1. AI-extrahering
          const { extracted: rawExtracted, usage: extractUsage } = await extractContract(apiKey, {
            text,
            fileBase64,
            mimeType,
          });
          void logAiUsage(supabase, "beta-analyze-contract:extract", extractUsage);

          const extracted: ExtractedContract = {
            ...rawExtracted,
            flagged_issues: Array.isArray(rawExtracted.flagged_issues)
              ? rawExtracted.flagged_issues
              : [],
          };

          // Manuell komplettering slår över extraherade värden
          const override = body["manual_override"] as Record<string, unknown> | undefined;
          if (override && typeof override === "object") {
            if (typeof override["offered_rate"] === "number") {
              extracted.offered_rate = override["offered_rate"];
            }
            if (override["profession"] === "Läkare" || override["profession"] === "Sjuksköterska") {
              extracted.profession = override["profession"];
            }
            if (typeof override["specialty"] === "string") {
              extracted.specialty = override["specialty"];
            }
            if (typeof override["region"] === "string") extracted.region = override["region"];
            if (COMPENSATION_TYPES.includes(override["compensation_type"] as CompensationType)) {
              extracted.compensation_type = override["compensation_type"] as CompensationType;
            }
          }

          if (typeof extracted.offered_rate !== "number" || !(extracted.offered_rate > 0)) {
            return json(
              { error: "Kunde inte hitta en timersättning i dokumentet", extracted },
              422,
            );
          }

          // 2. Zon
          let zone: number | null = null;
          if (extracted.region) {
            const { data: zoneData, error: zoneError } = await supabase.rpc("beta_resolve_zone", {
              p_region: extracted.region,
            });
            if (zoneError) console.error("beta-analyze-contract: zonuppslag", zoneError.message);
            zone = typeof zoneData === "number" ? zoneData : null;
          }
          const zone_assumed = zone === null;
          const resolvedZone = zone ?? 2;

          // 3. Takpris
          const { data: matchData, error: matchError } = await supabase.rpc(
            "beta_match_benchmark",
            {
              p_profession: extracted.profession,
              p_specialty: extracted.specialty,
              p_zone: resolvedZone,
            },
          );
          if (matchError) console.error("beta-analyze-contract: takpris", matchError.message);

          const match = (Array.isArray(matchData) ? matchData[0] : matchData) as
            | {
                ceiling_rate_sek: number | null;
                specialty: string | null;
                source: string | null;
                match_quality: string;
              }
            | undefined;

          const benchmarkAssumed = !match || match.ceiling_rate_sek === null;
          const benchmarkRate = benchmarkAssumed
            ? (DEFAULT_BENCHMARK[extracted.profession] ?? 780)
            : Number(match!.ceiling_rate_sek);

          const benchmark = {
            rate: benchmarkRate,
            specialty: benchmarkAssumed ? null : match!.specialty,
            source: benchmarkAssumed ? "Schablon i avsaknad av matchning" : match!.source,
            match_quality: match?.match_quality ?? "none",
            assumed: benchmarkAssumed,
          };

          // 4. Kalkyl
          const calc = calculate({
            offered_rate: extracted.offered_rate,
            compensation_type: extracted.compensation_type,
            housing_included: !!extracted.housing_included,
            travel_included: !!extracted.travel_included,
            benchmark_rate: benchmarkRate,
          });

          // 5. Motbud
          const counter = await generateCounterOffers(apiKey, {
            profession: extracted.profession,
            specialty: benchmark.specialty ?? extracted.specialty,
            region: extracted.region,
            zone: resolvedZone,
            benchmark_rate: benchmarkRate,
            offered_rate: extracted.offered_rate,
            margin_pct: calc.margin_pct,
            counter_target_rate_user_terms: calc.counter_target_rate_user_terms,
            compensation_type: extracted.compensation_type,
            flagged_issues: extracted.flagged_issues,
          });
          void logAiUsage(supabase, "beta-analyze-contract:counter", counter.usage);

          // 6. Spara
          const { data: saved, error: saveError } = await supabase
            .from("beta_contract_analyses")
            .insert({
              profession: extracted.profession,
              specialty: extracted.specialty,
              region: extracted.region ?? "Okänd",
              zone: resolvedZone,
              compensation_type: extracted.compensation_type,
              offered_rate: extracted.offered_rate,
              housing_included: !!extracted.housing_included,
              travel_included: !!extracted.travel_included,
              ob_specified: !!extracted.ob_specified,
              matched_benchmark_rate: benchmarkRate,
              estimated_agency_margin_pct: calc.margin_pct,
              margin_tier: calc.tier,
              flagged_issues: extracted.flagged_issues,
              generated_counter_offer: counter.soft,
            })
            .select("id")
            .single();

          if (saveError) {
            console.error("beta-analyze-contract: kunde inte spara analysen", saveError.message);
          }

          return json({
            analysis_id: saved?.id ?? null,
            requested_tone: tone,
            extracted: {
              profession: extracted.profession,
              specialty: extracted.specialty,
              region: extracted.region,
              compensation_type: extracted.compensation_type,
              offered_rate: extracted.offered_rate,
              housing_included: !!extracted.housing_included,
              travel_included: !!extracted.travel_included,
              ob_specified: !!extracted.ob_specified,
              masked_summary: extracted.masked_summary,
              confidence: extracted.confidence,
            },
            zone: resolvedZone,
            zone_assumed,
            benchmark,
            calc: {
              normalized_rate: calc.normalized_rate,
              normalization_note: calc.normalization_note,
              cost_adjustment: calc.cost_adjustment,
              margin_pct: calc.margin_pct,
              margin_pct_display: calc.margin_pct_display,
              tier: calc.tier,
              counter_target_rate: calc.counter_target_rate,
              counter_target_rate_user_terms: calc.counter_target_rate_user_terms,
            },
            counter_offers: { soft: counter.soft, sharp: counter.sharp },
            flagged_issues: extracted.flagged_issues,
          });
        } catch (err) {
          if (err instanceof BetaAiError) {
            return json({ error: err.message }, err.status);
          }
          console.error(
            "beta-analyze-contract: oväntat fel",
            err instanceof Error ? err.message : "okänt",
          );
          return json({ error: "Ett oväntat fel inträffade" }, 500);
        }
      },
    },
  },
});
