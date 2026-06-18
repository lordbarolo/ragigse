import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGINS = new Set([
  "https://compcare.se",
  "https://www.compcare.se",
  "https://compcare-se.lovable.app",
]);

function buildCors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allow = ALLOWED_ORIGINS.has(origin) || /\.lovable\.app$/.test(new URL(origin || "https://x").hostname)
    ? origin
    : "https://compcare.se";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action") || "view";
    const documentId = url.searchParams.get("document_id");
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const ua = req.headers.get("user-agent") || null;

    // Logga åtkomst (bästa möjliga, blockerar inte svar)
    supabase.rpc("log_document_share_view", {
      _token: token,
      _ip: ip,
      _user_agent: ua,
      _document_id: documentId,
      _action: action,
    }).then(({ error }) => { if (error) console.error("log error", error); });

    const { data, error } = await supabase.rpc("get_document_share_by_token", { _token: token });
    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: corsHeaders });
    }
    if ((data as any).expired) {
      return new Response(JSON.stringify({ expired: true }), { status: 410, headers: corsHeaders });
    }

    const docs = ((data as any).documents || []) as Array<{ id: string; file_name: string; document_type: string; uploaded_at: string }>;
    const expiresAt = (data as any).expires_at as string;

    // Build URLs that route through the watermarking download endpoint.
    // The raw signed storage URL is intentionally never exposed to the recipient.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const downloadBase = `${supabaseUrl}/functions/v1/download-shared-document`;
    const withUrls = docs.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      document_type: d.document_type,
      uploaded_at: d.uploaded_at,
      signed_url: `${downloadBase}?token=${encodeURIComponent(token)}&document_id=${encodeURIComponent(d.id)}`,
    }));


    return new Response(
      JSON.stringify({
        owner_name: (data as any).owner_name,
        recipient_label: (data as any).recipient_label,
        recipient_email: (data as any).recipient_email,
        expires_at: expiresAt,
        documents: withUrls,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("get-shared-documents error", err);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: corsHeaders });
  }
});
