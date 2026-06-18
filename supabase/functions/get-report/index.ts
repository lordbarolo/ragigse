import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

async function verifyReportAccessToken(token: string, reportId: string): Promise<string | null> {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const payloadRaw = decodeBase64Url(payloadPart);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signatureRaw = Uint8Array.from(decodeBase64Url(signaturePart), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, signatureRaw, encoder.encode(payloadRaw));
  if (!valid) return null;

  const payload = JSON.parse(payloadRaw) as { report_id?: string; email?: string; exp?: number };
  if (payload.report_id !== reportId || !payload.email || !payload.exp || payload.exp < Date.now()) return null;
  return payload.email.toLowerCase().trim();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report_id, access_token } = await req.json();

    if (!report_id) {
      return new Response(JSON.stringify({ error: "Missing report_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract auth_user_id from JWT server-side instead of trusting request body
    let authUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await anonClient.auth.getClaims(token);
      if (claimsData?.claims?.sub) {
        authUserId = claimsData.claims.sub as string;
      }
    }

    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();

    if (error || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine access level — full access requires payment, referral unlock, or ownership.
    // Rapporter innehåller personuppgifter (lön, region, yrke) och får INTE vara öppna
    // för alla med UUID. Endast ägare, betald, eller referral-unlocked får fullt innehåll.
    const isPaid = report.status === "paid";
    const isReferralUnlocked = report.unlocked_by_referral === true;
    const isOwner = !!authUserId && report.user_id === authUserId;
    let isTokenUnlocked = false;
    if (typeof access_token === "string" && access_token.length > 0) {
      try {
        const tokenEmail = await verifyReportAccessToken(access_token, report_id);
        const reportEmail = report.email ? String(report.email).toLowerCase().trim() : null;
        isTokenUnlocked = !!tokenEmail && !!reportEmail && tokenEmail === reportEmail;
      } catch (tokenError) {
        console.warn("Invalid report access token", tokenError);
      }
    }
    const fullAccess = isPaid || isReferralUnlocked || isOwner || isTokenUnlocked;

    // Build response based on access level. Email is only returned to the authenticated owner.
    const response: Record<string, unknown> = {
      id: report.id,
      lead_id: report.lead_id || null,
      status: report.status,
      occupation: report.occupation,
      employment_type: report.employment_type,
      kommun: report.kommun,
      experience: report.experience,
      email: isOwner || isTokenUnlocked ? report.email : null,
      ab_variant: report.ab_variant || "A",
      unlocked_by_referral: isReferralUnlocked,
    };

    if (fullAccess) {
      // Full access
      response.result_json = report.result_json;
      response.access = "full";

      // Fetch zone comparisons for the same occupation type
      const resultJson = report.result_json as Record<string, unknown> | null;
      const occupation = report.occupation;

      if (occupation) {
        // Find the rate type matching this occupation
        const { data: matchingRates } = await supabase
          .from("rates")
          .select("yrkeskategori, zon, timpris_kund")
          .eq("yrkeskategori", occupation);

        if (!matchingRates || matchingRates.length === 0) {
          // Try matching by typ instead
          const { data: anyRate } = await supabase
            .from("rates")
            .select("typ")
            .eq("yrkeskategori", occupation)
            .limit(1);

          if (anyRate && anyRate.length > 0) {
            const { data: typeRates } = await supabase
              .from("rates")
              .select("yrkeskategori, zon, timpris_kund")
              .eq("typ", anyRate[0].typ);
            response.zone_comparisons = typeRates || [];
          }
        } else {
          response.zone_comparisons = matchingRates;
        }

      // Also get the user's zone from locations
        if (report.kommun) {
          const { data: loc } = await supabase
            .from("locations")
            .select("zon")
            .eq("kommun", report.kommun)
            .limit(1);
          if (loc && loc.length > 0) {
            response.user_zone = loc[0].zon;
          }

          // Fetch price history for this occupation
          const { data: priceChanges } = await supabase
            .from("price_changes")
            .select("yrkeskategori, zon, old_timpris, new_timpris, diff_abs, diff_pct, change_type, detected_at")
            .eq("yrkeskategori", occupation)
            .order("detected_at", { ascending: false })
            .limit(10);
          if (priceChanges && priceChanges.length > 0) {
            response.price_history = priceChanges;
          }
        }
      }
    } else {
      // Preview: only expose inputs and safe teaser fields — never raw rates or margins
      const resultJson = report.result_json as Record<string, unknown> | null;
      if (resultJson) {
        const market = resultJson.market as Record<string, unknown> | null;
        const safeMarket: Record<string, unknown> = {};
        // Only expose non-sensitive aggregate fields for teaser display
        if (market) {
          if (market.source) safeMarket.source = market.source;
          if (market.year) safeMarket.year = market.year;
          if (market.region) safeMarket.region = market.region;
          // Explicitly exclude: rate_customer_sek_per_hour, percentiles, average_monthly
        }
        response.result_json = {
          calc_version: resultJson.calc_version,
          track: resultJson.track,
          inputs: resultJson.inputs,
          market: safeMarket,
        };
      }
      response.access = "preview";
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get report error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
