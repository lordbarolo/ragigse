// Reads an uploaded IVO/HOSP document, extracts the holder's name with Lovable AI
// and compares it to the user's profile name. Returns a diff object — never mutates
// the profile automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  // require >=2 overlapping tokens (förnamn + efternamn)
  let overlap = 0;
  for (const t of ta) if (tb.has(t) && t.length > 1) overlap++;
  return overlap >= 2;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return json({ error: "unauthorized" }, 401);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const documentId = String(body.document_id ?? "");
    if (!documentId) return json({ error: "document_id required" }, 400);

    // Fetch the document and verify ownership
    const { data: doc, error: dErr } = await admin
      .from("consultant_documents")
      .select("id, file_url, document_type, consultant_id, file_name")
      .eq("id", documentId)
      .maybeSingle();
    if (dErr || !doc) return json({ error: "document_not_found" }, 404);

    const { data: cp } = await admin
      .from("consultant_profiles")
      .select("id, user_id")
      .eq("id", doc.consultant_id)
      .maybeSingle();
    if (!cp || cp.user_id !== userId) return json({ error: "forbidden" }, 403);

    if (!["ivo", "hosp"].includes(doc.document_type)) {
      return json({ error: "Only IVO/HOSP documents are checked" }, 400);
    }

    // Fetch profile name
    const { data: profile } = await admin
      .from("ref_profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const profileName = (profile?.full_name ?? "").trim();

    // Get a short-lived signed URL and download the file
    const { data: signed } = await admin.storage
      .from("verifications")
      .createSignedUrl(doc.file_url, 120);
    if (!signed?.signedUrl) return json({ error: "file_unavailable" }, 500);

    const fileResp = await fetch(signed.signedUrl);
    if (!fileResp.ok) return json({ error: "file_fetch_failed" }, 500);
    const buf = new Uint8Array(await fileResp.arrayBuffer());
    const mime = fileResp.headers.get("content-type") || "application/pdf";
    // Convert to base64
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const dataUrl = `data:${mime};base64,${b64}`;

    // Call Lovable AI Gateway with tool-calling for structured output
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "Du läser svenska IVO- och HOSP-utdrag. Returnera ENDAST personens fullständiga namn så som det står på intyget. Inga titlar, inga personnummer, ingen extra text.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    `Detta är ett ${doc.document_type.toUpperCase()}-utdrag. Extrahera personens fullständiga namn.`,
                },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_name",
                description: "Rapportera namnet som står på intyget.",
                parameters: {
                  type: "object",
                  properties: {
                    full_name: {
                      type: "string",
                      description: "Fullständigt namn exakt som det står på intyget",
                    },
                    confidence: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                  },
                  required: ["full_name", "confidence"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_name" } },
        }),
      },
    );

    if (aiResp.status === 429) return json({ error: "rate_limited" }, 429);
    if (aiResp.status === 402) return json({ error: "ai_credits" }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return json({ error: "ai_error" }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let extractedName = "";
    let confidence = "low";
    try {
      const args = JSON.parse(toolCall?.function?.arguments ?? "{}");
      extractedName = String(args.full_name ?? "").trim();
      confidence = String(args.confidence ?? "low");
    } catch (_) {
      // ignore
    }

    if (!extractedName) {
      await admin
        .from("consultant_documents")
        .update({
          name_check_status: "no_name_found",
          name_check_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      return json({
        match: false,
        extracted_name: null,
        profile_name: profileName,
        status: "no_name_found",
      });
    }

    const matched = namesMatch(profileName, extractedName);
    const status = matched ? "match" : "mismatch";

    await admin
      .from("consultant_documents")
      .update({
        extracted_name: extractedName,
        name_check_status: status,
        name_check_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    return json({
      match: matched,
      extracted_name: extractedName,
      profile_name: profileName,
      confidence,
      status,
    });
  } catch (e) {
    console.error("verify-document-name error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
