import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const verificationId = url.searchParams.get("id");

    if (!verificationId || verificationId.length < 10) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'id' query parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log access
    await supabase.from("ref_access_logs").insert({
      resource_type: "verify_api",
      resource_id: verificationId,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      viewer_name: req.headers.get("x-viewer-name") || null,
      viewer_org: req.headers.get("x-viewer-org") || null,
    });

    // Fetch representation request
    const { data: repr } = await supabase
      .from("ref_representation_requests")
      .select("agency_name, assignment_id, region, consultant_email, signed_at, bankid_ref, verification_id, status")
      .eq("verification_id", verificationId)
      .eq("status", "signed")
      .maybeSingle();

    // Fetch attached references via edge function
    let references: unknown[] = [];
    try {
      const { data: vaultData } = await supabase.functions.invoke("reference-vault", {
        body: { action: "get-attached", application_id: verificationId },
      });
      references = vaultData?.references || [];
    } catch {
      // References are optional
    }

    // Build W3C-inspired JSON-LD response
    const response = {
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      identifier: verificationId,
      name: "Representationsbevis",
      datePublished: repr?.signed_at || null,
      creator: {
        "@type": "Organization",
        name: repr?.agency_name || "CompCare",
      },
      representation: repr
        ? {
            agency_name: repr.agency_name,
            assignment_id: repr.assignment_id,
            region: repr.region,
            status: repr.status,
            signed_at: repr.signed_at,
            bankid_verified: !!repr.bankid_ref,
          }
        : null,
      references: (references as any[]).map((r: any) => ({
        giver_name: r.giver_name,
        workplace: r.workplace,
        relationship: r.relationship,
        period: r.period,
        verification_level: r.verification_level,
        last_confirmed_at: r.last_confirmed_at,
        competencies: r.competencies,
        recommendation_score: r.recommendation_score,
      })),
      meta: {
        generated_at: new Date().toISOString(),
        source: "compcare.se",
        api_version: "1.0",
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
