import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

const TIER_LABEL: Record<string, string> = {
  elite: "Elite",
  verified_pro: "Verified Pro",
  basic: "Basic",
  incomplete: "Incomplete",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  cv: "CV",
  certificate: "Certificate",
  license: "License",
  contract: "Contract",
  ivo: "IVO certificate",
  hosp: "HOSP certificate",
  other: "Other",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const profileId = url.searchParams.get("id");

    if (!profileId || profileId.length < 10) {
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
      resource_type: "public_profile_api",
      resource_id: profileId,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      viewer_name: req.headers.get("x-viewer-name") || null,
      viewer_org: req.headers.get("x-viewer-org") || null,
    });

    // Reuse the same RPC the frontend uses
    const { data: profile, error } = await supabase.rpc("ref_get_public_profile", {
      _profile_id: profileId,
    });

    if (error || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const p = profile as any;
    const activeRefs = (p.references || []).filter((r: any) => r.attachable !== false);

    // Build schema.org Person + ProfessionalService JSON-LD
    const response = {
      "@context": "https://schema.org",
      "@type": "Person",
      identifier: profileId,
      name: p.full_name,
      jobTitle: p.specialty || null,
      description: p.bio || null,
      hasCredential: [
        ...(p.verifications?.bankid
          ? [{
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "Digital identity verification",
              recognizedBy: { "@type": "Organization", name: "vårdbemanning.ai" },
            }]
          : []),
        ...(p.verifications?.ivo
          ? [{
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "IVO certificate",
              recognizedBy: { "@type": "Organization", name: "Inspektionen för vård och omsorg" },
            }]
          : []),
        ...(p.verifications?.hosp
          ? [{
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "HOSP certificate",
              recognizedBy: { "@type": "Organization", name: "Socialstyrelsen" },
            }]
          : []),
      ],
      // vårdbemanning.ai-specific data
      vardbemanning.ai: {
        trust_score: p.trust_score,
        trust_tier: p.trust_tier,
        trust_tier_label: TIER_LABEL[p.trust_tier] ?? TIER_LABEL.incomplete,
        score_updated_at: p.score_updated_at,
        reference_count: p.reference_count,
        attachable_reference_count: activeRefs.length,
        avg_recommendation: p.avg_recommendation,
        competencies: p.competencies || {},
        years_licensed: p.years_licensed || null,
      },
      references: activeRefs.map((r: any) => ({
        relationship: r.relationship,
        workplace: r.workplace,
        period_start: r.period_start,
        period_end: r.period_end,
        recommendation_score: r.recommendation_score,
        competencies: r.competencies || [],
        verification_level: r.verification_level,
        last_confirmed_at: r.last_confirmed_at,
        confirmed_at: r.confirmed_at,
      })),
      documents: (p.documents || []).map((d: any) => ({
        file_name: d.file_name,
        document_type: d.document_type,
        document_type_label: DOC_TYPE_LABELS[d.document_type] || d.document_type,
        uploaded_at: d.uploaded_at,
      })),
      meta: {
        generated_at: new Date().toISOString(),
        source: "vardbemanning.ai",
        api_version: "1.0",
        canonical_url: `https://vardbemanning.ai/profil/${profileId}`,
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
