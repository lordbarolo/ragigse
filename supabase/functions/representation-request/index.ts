import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://compcare.se";

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Hitta aktiv exklusivitet för (consultant_email, region) där sista svarsdag
 * fortfarande är ≥ idag. Detta är den nya soft-collision-logiken: en konsult
 * kan vara representerad av ett bolag i taget per region under aktivt avrop.
 */
async function findActiveExclusivity(
  admin: ReturnType<typeof createClient>,
  consultantEmail: string,
  region: string,
  excludeId?: string,
) {
  const today = new Date().toISOString().slice(0, 10);
  let query = admin
    .from("ref_representation_requests")
    .select("id, agency_name, signed_at, verification_id, response_deadline, period_start, period_end, unit")
    .eq("region", region)
    .eq("status", "signed")
    .is("superseded_by", null)
    .gte("response_deadline", today)
    .ilike("consultant_email", consultantEmail)
    .order("signed_at", { ascending: false })
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  return data;
}

/**
 * Logga ett event för representations-funneln. Best-effort — fel sväljs.
 */
async function logEvent(
  admin: ReturnType<typeof createClient>,
  requestId: string,
  eventType: string,
  actor: "agency" | "consultant" | "system",
  metadata: Record<string, unknown> = {},
) {
  try {
    await admin.from("representation_events").insert({
      representation_request_id: requestId,
      event_type: eventType,
      actor,
      metadata,
    });
  } catch (err) {
    console.error(`logEvent ${eventType} failed:`, err);
  }
}

async function sendInviteEmail(
  admin: ReturnType<typeof createClient>,
  requestId: string,
  payload: {
    consultant_email: string;
    agency_name: string;
    region: string;
    unit: string | null;
    consultant_name: string | null;
    competence: string | null;
    period_start: string | null;
    period_end: string | null;
    response_deadline: string | null;
    secret_token: string;
  },
) {
  const signingUrl = `${SITE_URL}/sign/${payload.secret_token}`;
  try {
    const { error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "representation-invite",
        recipientEmail: payload.consultant_email,
        templateData: {
          agencyName: payload.agency_name,
          region: payload.region,
          unit: payload.unit,
          consultantName: payload.consultant_name,
          competence: payload.competence,
          periodStart: payload.period_start,
          periodEnd: payload.period_end,
          responseDeadline: payload.response_deadline,
          signingUrl,
        },
      },
    });
    if (error) throw error;
    await admin
      .from("ref_representation_requests")
      .update({ email_sent_at: new Date().toISOString(), email_status: "sent" })
      .eq("id", requestId);
    await logEvent(admin, requestId, "email_sent", "system", {
      recipient: payload.consultant_email,
      region: payload.region,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    await admin
      .from("ref_representation_requests")
      .update({ email_status: "failed" })
      .eq("id", requestId);
    await logEvent(admin, requestId, "email_failed", "system", {
      error: (err as Error).message,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── GET BY TOKEN (public) ─────────────────────────
    if (action === "get-by-token") {
      const { token } = params;
      if (!token) return jsonResponse({ error: "Missing token" }, 400);

      const { data, error } = await admin
        .from("ref_representation_requests")
        .select("*")
        .eq("secret_token", token)
        .single();

      if (error || !data) return jsonResponse({ error: "Request not found" }, 404);

      // Surface aktiv exklusivitet (varning, ej blockering)
      let activeExclusivity = null;
      if (data.status === "pending" && data.region) {
        const existing = await findActiveExclusivity(
          admin,
          data.consultant_email,
          data.region,
          data.id,
        );
        if (existing) {
          activeExclusivity = {
            agency_name: existing.agency_name,
            signed_at: existing.signed_at,
            verification_id: existing.verification_id,
            response_deadline: existing.response_deadline,
            unit: existing.unit,
          };
        }
      }

      // Logga link_opened (endast vid pending — undvik dubbeltrigger vid omladdning av success-vyn)
      if (data.status === "pending") {
        await logEvent(admin, data.id, "link_opened", "consultant", {
          had_active_exclusivity: !!activeExclusivity,
        });
      }

      return jsonResponse({ request: data, activeExclusivity });
    }

    // ── SIGN (public via token) ───────────────────────
    if (action === "sign") {
      const { token } = params;
      if (!token) return jsonResponse({ error: "Missing token" }, 400);

      const { data: request, error: fetchErr } = await admin
        .from("ref_representation_requests")
        .select("*")
        .eq("secret_token", token)
        .eq("status", "pending")
        .single();

      if (fetchErr || !request) {
        return jsonResponse(
          { error: "Request not found or already processed" },
          404,
        );
      }

      // Hitta aktiv exklusivitet → markera den som ersatt (soft collision)
      const existing = request.region
        ? await findActiveExclusivity(
            admin,
            request.consultant_email,
            request.region,
            request.id,
          )
        : null;

      const confirmationRef = `LINK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const periodText = request.period_start && request.period_end
        ? `${request.period_start} – ${request.period_end}`
        : "uppdragets period";

      const payload = {
        signed_text:
          `Jag, ${request.consultant_name || request.consultant_email}, intygar härmed ` +
          `att jag givit ${request.agency_name} (org.nr ${request.agency_org_number || "—"}) ` +
          `exklusiv rätt att förmedla detta uppdrag för enheten ${request.unit || "—"} ` +
          `i ${request.region} under perioden ${periodText}.`,
        confirmation_ref: confirmationRef,
        signed_at: new Date().toISOString(),
        consultant_email: request.consultant_email,
        consultant_name: request.consultant_name,
        competence: request.competence,
        agency_name: request.agency_name,
        agency_org_number: request.agency_org_number,
        region: request.region,
        unit: request.unit,
        period_start: request.period_start,
        period_end: request.period_end,
        response_deadline: request.response_deadline,
        assignment_id: request.assignment_id,
        method: "link_confirmation",
        superseded_previous: existing?.id || null,
      };

      const { data: verification } = await admin
        .from("ref_verifications")
        .insert({
          profile_id:
            request.consultant_user_id ||
            "00000000-0000-0000-0000-000000000000",
          type: "representation",
          result: "verified",
          notes:
            `Representation: ${request.agency_name} · ${request.region} · ${request.unit || "—"}`,
        })
        .select("id")
        .single();

      const verificationId = verification?.id || null;

      // Markera tidigare aktiv exklusivitet som ersatt INNAN vi sätter status=signed
      // för att undgå unique-index-konflikt
      if (existing) {
        await admin
          .from("ref_representation_requests")
          .update({ superseded_by: request.id })
          .eq("id", existing.id);
      }

      const { error: updateErr } = await admin
        .from("ref_representation_requests")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          bankid_ref: confirmationRef,
          payload,
          verification_id: verificationId,
        })
        .eq("id", request.id);

      if (updateErr) {
        console.error("Sign update error:", updateErr);
        throw updateErr;
      }

      return jsonResponse({
        success: true,
        verification_id: verificationId,
        confirmation_ref: confirmationRef,
        superseded: existing ? {
          agency_name: existing.agency_name,
          signed_at: existing.signed_at,
        } : null,
      });
    }

    // ── LIST (agency, requires auth) ─────────────────
    if (action === "list") {
      const userId = await getAuthUserId(req);
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const { data, error } = await admin
        .from("ref_representation_requests")
        .select("*")
        .eq("agency_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const counts = {
        total: (data || []).length,
        pending: (data || []).filter((r: any) => r.status === "pending").length,
        signed: (data || []).filter((r: any) => r.status === "signed" && !r.superseded_by).length,
        declined: (data || []).filter((r: any) => r.status === "declined").length,
      };

      return jsonResponse({ requests: data || [], counts });
    }

    // ── CREATE (agency, requires auth) ───────────────
    if (action === "create") {
      const userId = await getAuthUserId(req);
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const {
        consultant_email,
        consultant_name,
        competence,
        region,
        unit,
        period_start,
        period_end,
        response_deadline,
        assignment_id,
        agency_name,
        agency_org_number,
      } = params;

      if (!consultant_email || !region || !response_deadline) {
        return jsonResponse({
          error: "Missing required fields (consultant_email, region, response_deadline)",
        }, 400);
      }

      // Soft warning vid skapande — blockera inte, bara informera
      const existing = await findActiveExclusivity(admin, consultant_email, region);

      const { data, error } = await admin
        .from("ref_representation_requests")
        .insert({
          agency_id: userId,
          consultant_email,
          consultant_name: consultant_name || null,
          competence: competence || null,
          region,
          unit: unit || null,
          period_start: period_start || null,
          period_end: period_end || null,
          response_deadline,
          assignment_id: assignment_id || null,
          agency_name: agency_name || "",
          agency_org_number: agency_org_number || null,
        })
        .select("id, secret_token")
        .single();

      if (error) throw error;

      sendInviteEmail(admin, data.id, {
        consultant_email,
        agency_name: agency_name || "Bemanningsföretag",
        region,
        unit: unit || null,
        consultant_name: consultant_name || null,
        competence: competence || null,
        period_start: period_start || null,
        period_end: period_end || null,
        response_deadline,
        secret_token: data.secret_token,
      }).catch((e) => console.error("Background email send failed:", e));

      return jsonResponse({
        created: data,
        warning: existing ? {
          type: "active_exclusivity",
          agency_name: existing.agency_name,
          response_deadline: existing.response_deadline,
        } : null,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Representation request error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
