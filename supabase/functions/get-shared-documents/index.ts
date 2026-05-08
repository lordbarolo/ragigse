import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("get_document_share_by_token", { _token: token });
    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: corsHeaders });
    }
    if ((data as any).expired) {
      return new Response(JSON.stringify({ expired: true }), { status: 410, headers: corsHeaders });
    }

    const docs = ((data as any).documents || []) as Array<{ id: string; file_name: string; document_type: string; file_url: string; uploaded_at: string }>;
    const expiresAt = (data as any).expires_at as string;
    const ttl = Math.max(60, Math.min(60 * 60 * 24, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));

    const withUrls = await Promise.all(
      docs.map(async (d) => {
        const { data: signed } = await supabase.storage
          .from("verifications")
          .createSignedUrl(d.file_url, ttl);
        return {
          id: d.id,
          file_name: d.file_name,
          document_type: d.document_type,
          uploaded_at: d.uploaded_at,
          signed_url: signed?.signedUrl ?? null,
        };
      }),
    );

    return new Response(
      JSON.stringify({
        owner_name: (data as any).owner_name,
        recipient_label: (data as any).recipient_label,
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
