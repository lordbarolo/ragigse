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

/** Check if a signed representation already exists for this consultant + assignment. */
async function findExistingSigned(
  admin: ReturnType<typeof createClient>,
  consultantEmail: string,
  assignmentId: string,
) {
  const { data } = await admin
    .from("ref_representation_requests")
    .select("id, agency_name, signed_at, verification_id")
    .eq("assignment_id", assignmentId)
    .eq("status", "signed")
    .ilike("consultant_email", consultantEmail)
    .maybeSingle();
  return data;
}

/** Send invite email via send-transactional-email (fire-and-forget logging). */
async function sendInviteEmail(
  admin: ReturnType<typeof createClient>,
  requestId: string,
  payload: {
    consultant_email: string;
    agency_name: string;
    assignment_id: string;
    region: string;
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
          assignmentId: payload.assignment_id,
          region: payload.region,
          signingUrl,
        },
      },
    });
    if (error) throw error;
    await admin
      .from("ref_representation_requests")
      .update({ email_sent_at: new Date().toISOString(), email_status: "sent" })
      .eq("id", requestId);
  } catch (err) {
    console.error("Failed to send invite email:", err);
    await admin
      .from("ref_representation_requests")
      .update({ email_status: "failed" })
      .eq("id", requestId);
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

      // Surface collision info if a different signed exists for same assignment+consultant
      let collision = null;
      if (data.status === "pending") {
        const existing = await findExistingSigned(
          admin,
          data.consultant_email,
          data.assignment_id,
        );
        if (existing && existing.id !== data.id) {
          collision = {
            agency_name: existing.agency_name,
            signed_at: existing.signed_at,
            verification_id: existing.verification_id,
          };
        }
      }

      return jsonResponse({ request: data, collision });
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

      // Final collision check at signing time
      const existing = await findExistingSigned(
        admin,
        request.consultant_email,
        request.assignment_id,
      );
      if (existing && existing.id !== request.id) {
        return jsonResponse({
          error: "collision",
          collision: {
            agency_name: existing.agency_name,
            signed_at: existing.signed_at,
            verification_id: existing.verification_id,
          },
        }, 409);
      }

      // Note: full BankID-style identity verification is on the roadmap.
      // For now we record a link-based confirmation.
      const confirmationRef = `LINK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const payload = {
        signed_text:
          `Jag bekräftar att jag gjort ett aktivt val att representeras av ${request.agency_name} för uppdrag ${request.assignment_id} i ${request.region}.`,
        confirmation_ref: confirmationRef,
        signed_at: new Date().toISOString(),
        consultant_email: request.consultant_email,
        agency_name: request.agency_name,
        assignment_id: request.assignment_id,
        region: request.region,
        method: "link_confirmation",
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
            `Representation signed for ${request.agency_name}, assignment ${request.assignment_id}`,
        })
        .select("id")
        .single();

      const verificationId = verification?.id || null;

      // Update with unique-index guard — race condition protection
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
        // Likely unique-index violation = race-collision
        if (updateErr.code === "23505") {
          return jsonResponse({ error: "collision" }, 409);
        }
        throw updateErr;
      }

      return jsonResponse({
        success: true,
        verification_id: verificationId,
        confirmation_ref: confirmationRef,
      });
    }

    // ── LIST (agency, requires auth) ─────────────────
    if (action === "list") {
      const userId = await getAuthUserId(req);
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const { data, error } = await admin
        .from("ref_representation_requests_safe")
        .select("*")
        .eq("agency_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const counts = {
        total: (data || []).length,
        pending: (data || []).filter((r: any) => r.status === "pending").length,
        signed: (data || []).filter((r: any) => r.status === "signed").length,
        declined:
          (data || []).filter((r: any) => r.status === "declined").length,
      };

      return jsonResponse({ requests: data || [], counts });
    }

    // ── CREATE (agency, requires auth) ───────────────
    if (action === "create") {
      const userId = await getAuthUserId(req);
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      const { consultant_email, assignment_id, region, agency_name } = params;
      if (!consultant_email || !assignment_id || !region) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      // Pre-create collision check
      const existing = await findExistingSigned(
        admin,
        consultant_email,
        assignment_id,
      );
      if (existing) {
        return jsonResponse({
          error: "collision",
          collision: {
            agency_name: existing.agency_name,
            signed_at: existing.signed_at,
            verification_id: existing.verification_id,
          },
        }, 409);
      }

      const { data, error } = await admin
        .from("ref_representation_requests")
        .insert({
          agency_id: userId,
          consultant_email,
          assignment_id,
          region,
          agency_name: agency_name || "",
        })
        .select("id, secret_token")
        .single();

      if (error) throw error;

      // Send invite email asynchronously — don't block response
      sendInviteEmail(admin, data.id, {
        consultant_email,
        agency_name: agency_name || "Bemanningsföretag",
        assignment_id,
        region,
        secret_token: data.secret_token,
      }).catch((e) => console.error("Background email send failed:", e));

      return jsonResponse({ created: data });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Representation request error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
