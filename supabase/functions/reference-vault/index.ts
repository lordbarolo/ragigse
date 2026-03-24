import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Extract authenticated user ID from JWT */
async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user from JWT
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    // --- GET VAULT ---
    if (action === "get-vault") {
      // Use authenticated user ID, ignore any client-supplied consultant_id
      const consultant_id = authUserId;

      // Fetch references with freshness computation
      const { data: refs, error } = await supabase
        .from("ref_references")
        .select("id, giver_name, giver_email, workplace, relationship, period_start, period_end, status, competencies, recommendation_score, confirmed_at, created_at, verification_level, last_confirmed_at, verified_at, expires_at, attachable")
        .eq("individual_id", consultant_id)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const sixMonthsMs = 6 * 30.44 * 24 * 60 * 60 * 1000;

      const vault = (refs || []).map((ref: any) => {
        const lastConfirmed = ref.last_confirmed_at ? new Date(ref.last_confirmed_at) : null;
        const isStale = lastConfirmed ? (now.getTime() - lastConfirmed.getTime() > sixMonthsMs) : true;
        const isActive = ref.status === "active";
        const effectiveAttachable = isActive && !isStale && ref.attachable;

        let group: "attachable" | "stale" | "pending";
        if (ref.status === "pending") {
          group = "pending";
        } else if (isStale) {
          group = "stale";
        } else if (effectiveAttachable) {
          group = "attachable";
        } else {
          group = "stale";
        }

        return {
          id: ref.id,
          giver_name: ref.giver_name,
          giver_email: ref.giver_email,
          workplace: ref.workplace,
          relationship: ref.relationship,
          period_start: ref.period_start,
          period_end: ref.period_end,
          competencies: ref.competencies,
          recommendation_score: ref.recommendation_score,
          status: ref.status,
          verification_level: ref.verification_level,
          last_confirmed_at: ref.last_confirmed_at,
          verified_at: ref.verified_at,
          expires_at: ref.expires_at,
          attachable: effectiveAttachable,
          is_stale: isStale && isActive,
          group,
          days_until_expiry: ref.expires_at
            ? Math.max(0, Math.round((new Date(ref.expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
            : null,
        };
      });

      const groupOrder = { attachable: 0, stale: 1, pending: 2 };
      vault.sort((a: any, b: any) => groupOrder[a.group as keyof typeof groupOrder] - groupOrder[b.group as keyof typeof groupOrder]);

      const counts = {
        total: vault.length,
        attachable: vault.filter((r: any) => r.group === "attachable").length,
        stale: vault.filter((r: any) => r.group === "stale").length,
        pending: vault.filter((r: any) => r.group === "pending").length,
      };

      return new Response(JSON.stringify({ vault, counts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ATTACH REFERENCES ---
    if (action === "attach") {
      const { application_id, reference_ids } = params;
      // Use JWT-derived user_id, not client-supplied
      const user_id = authUserId;

      if (!application_id || !reference_ids?.length) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify all references are attachable and owned by the authenticated user
      const { data: refs, error: refError } = await supabase
        .from("ref_references")
        .select("id, attachable, individual_id, verification_level, last_confirmed_at, expires_at")
        .in("id", reference_ids)
        .eq("individual_id", user_id);

      if (refError) throw refError;

      const now = new Date();
      const sixMonthsMs = 6 * 30.44 * 24 * 60 * 60 * 1000;

      const invalid = (refs || []).filter((r: any) => {
        const lastConfirmed = r.last_confirmed_at ? new Date(r.last_confirmed_at) : null;
        const isStale = lastConfirmed ? (now.getTime() - lastConfirmed.getTime() > sixMonthsMs) : true;
        return !r.attachable || isStale;
      });

      if (invalid.length > 0) {
        return new Response(JSON.stringify({
          error: "Some references are not attachable",
          invalid_ids: invalid.map((r: any) => r.id),
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if ((refs || []).length !== reference_ids.length) {
        return new Response(JSON.stringify({ error: "Some references not found or not owned by user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const attachRows = reference_ids.map((ref_id: string) => ({
        application_id,
        reference_id: ref_id,
        attached_by_user_id: user_id,
      }));

      const { error: attachError } = await supabase
        .from("ref_application_references")
        .upsert(attachRows, { onConflict: "application_id,reference_id" });

      if (attachError) throw attachError;

      for (const ref_id of reference_ids) {
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const tokenHash = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        await supabase
          .from("ref_reference_artifacts")
          .insert({
            reference_id: ref_id,
            artifact_type: "compcare_attach",
            token_hash: tokenHash,
            expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });
      }

      return new Response(JSON.stringify({
        attached: reference_ids.length,
        application_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- GET ATTACHED REFERENCES FOR APPLICATION ---
    if (action === "get-attached") {
      const { application_id } = params;
      if (!application_id) {
        return new Response(JSON.stringify({ error: "Missing application_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the authenticated user owns this application's attached references
      const { data: attached, error } = await supabase
        .from("ref_application_references")
        .select(`
          id,
          created_at,
          reference_id,
          attached_by_user_id,
          ref_references!inner (
            giver_name,
            workplace,
            relationship,
            period_start,
            period_end,
            verification_level,
            last_confirmed_at,
            competencies,
            recommendation_score
          )
        `)
        .eq("application_id", application_id)
        .eq("attached_by_user_id", authUserId);

      if (error) throw error;

      const now = new Date();
      const sixMonthsMs = 6 * 30.44 * 24 * 60 * 60 * 1000;

      const refIds = (attached || []).map((row: any) => row.reference_id);

      const { data: artifacts } = refIds.length
        ? await supabase
            .from("ref_reference_artifacts")
            .select("reference_id, token_hash")
            .in("reference_id", refIds)
            .eq("status", "active")
            .eq("artifact_type", "compcare_attach")
        : { data: [] };

      const tokenMap = new Map<string, string>();
      for (const a of artifacts || []) {
        if (!tokenMap.has(a.reference_id)) {
          tokenMap.set(a.reference_id, a.token_hash);
        }
      }

      const references = (attached || [])
        .map((row: any) => {
          const lastConfirmed = row.ref_references.last_confirmed_at
            ? new Date(row.ref_references.last_confirmed_at)
            : null;
          const isFresh = lastConfirmed
            ? (now.getTime() - lastConfirmed.getTime() < sixMonthsMs)
            : false;

          return {
            id: row.reference_id,
            attached_at: row.created_at,
            giver_name: row.ref_references.giver_name,
            workplace: row.ref_references.workplace,
            relationship: row.ref_references.relationship,
            period: `${row.ref_references.period_start}–${row.ref_references.period_end || "pågående"}`,
            verification_level: row.ref_references.verification_level,
            last_confirmed_at: row.ref_references.last_confirmed_at,
            competencies: row.ref_references.competencies,
            recommendation_score: row.ref_references.recommendation_score,
            is_fresh: isFresh,
            artifact_token: tokenMap.get(row.reference_id) || null,
          };
        })
        .filter((r: any) =>
          r.is_fresh &&
          r.verification_level !== "submitted" &&
          r.artifact_token !== null
        );

      return new Response(JSON.stringify({ references }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Reference vault error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
