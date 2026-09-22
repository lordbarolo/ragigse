import { createFileRoute } from "@tanstack/react-router";
import { OUTCOME_MESSAGES, resolveGrant, serviceClient } from "@/lib/trust/share.server";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/trust/attest/$token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: corsHeaders }),
      POST: async ({ request, params }) => {
        try {
          const token = String((params as { token?: string }).token ?? "");
          const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!body) return json({ error: "Ogiltig förfrågan" }, 400);

          const credentialId = String(body["credential_id"] ?? "");
          const response = String(body["response"] ?? "");
          const commentRaw = body["comment"];
          const comment =
            typeof commentRaw === "string" ? commentRaw.trim().slice(0, 2000) : undefined;

          if (!UUID_RE.test(credentialId)) return json({ error: "Ogiltigt underlag" }, 400);
          if (!["confirmed", "denied"].includes(response)) {
            return json({ error: "Ange om uppgiften bekräftas eller avvisas" }, 400);
          }

          const supabase = serviceClient();
          const { grant, outcome } = await resolveGrant(supabase, request, token, true);
          if (!grant) {
            return json({ error: OUTCOME_MESSAGES[outcome] ?? OUTCOME_MESSAGES["not_found"] }, 404);
          }
          if (!["attestation", "revalidation"].includes(grant.grant_kind)) {
            return json({ error: OUTCOME_MESSAGES["scope_denied"] }, 404);
          }

          const allowedIds = grant.scope?.credential_ids ?? [];
          if (allowedIds.length > 0 && !allowedIds.includes(credentialId)) {
            return json({ error: OUTCOME_MESSAGES["scope_denied"] }, 404);
          }

          const { data: credential, error: credErr } = await supabase
            .from("trust_credentials")
            .select("id, status")
            .eq("id", credentialId)
            .eq("subject_user_id", grant.subject_user_id)
            .maybeSingle();

          if (credErr) {
            console.error("trust-attest: kunde inte läsa underlaget", credErr.message);
            return json({ error: "Kunde inte spara svaret" }, 500);
          }
          if (!credential) return json({ error: OUTCOME_MESSAGES["scope_denied"] }, 404);

          // Attestering skriver enbart en händelse. Status ändras aldrig här –
          // det sker via trust_transition_credential efter granskning.
          const { error: eventErr } = await supabase.from("trust_verification_events").insert({
            credential_id: credentialId,
            event_type: grant.grant_kind === "revalidation" ? "reconfirmed" : "attested",
            actor_kind: "issuer",
            reason: comment ?? null,
            payload: {
              response,
              grant_id: grant.grant_id,
              verification_method: grant.grant_kind === "revalidation" ? "link_revalidation" : "link_attestation",
            },
          });

          if (eventErr) {
            console.error("trust-attest: kunde inte skriva händelse", eventErr.message);
            return json({ error: "Kunde inte spara svaret" }, 500);
          }

          return json({ ok: true });
        } catch (err) {
          console.error("trust-attest: oväntat fel", err instanceof Error ? err.message : "okänt");
          return json({ error: "Ett oväntat fel inträffade" }, 500);
        }
      },
    },
  },
});
