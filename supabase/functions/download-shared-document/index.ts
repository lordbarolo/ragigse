import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PDFDocument, StandardFonts, rgb, degrees } from "https://esm.sh/pdf-lib@1.17.1";

// Public download endpoint for shared documents.
// - Validates the share token
// - Verifies the document belongs to the share
// - For PDFs: overlays a diagonal watermark with recipient label + timestamp + viewer IP
// - For other file types: streams the original bytes
// The signed storage URL is never exposed to the recipient.

const ALLOWED_ORIGINS = new Set([
  "https://compcare.se",
  "https://www.compcare.se",
  "https://compcare-se.lovable.app",
]);

function buildCors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allow =
    ALLOWED_ORIGINS.has(origin) || /\.lovable\.app$/.test(new URL(origin || "https://x").hostname)
      ? origin
      : "https://compcare.se";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "document";
}

async function watermarkPdf(
  bytes: Uint8Array,
  watermarkText: string,
  footerText: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const footerFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();

    // Diagonal repeating watermark (subtle, grey, ~12% opacity)
    const fontSize = Math.max(18, Math.min(width, height) * 0.04);
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    const step = textWidth + 80;

    page.pushOperators();
    for (let y = -height; y < height * 2; y += step) {
      for (let x = -width; x < width * 2; x += step) {
        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.55, 0.55, 0.6),
          opacity: 0.12,
          rotate: degrees(-30),
        });
      }
    }

    // Footer band with timestamp + recipient
    const footerSize = 8;
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 16,
      color: rgb(0.95, 0.95, 0.97),
      opacity: 0.85,
    });
    page.drawText(footerText, {
      x: 8,
      y: 5,
      size: footerSize,
      font: footerFont,
      color: rgb(0.3, 0.3, 0.35),
    });
  }

  return await pdfDoc.save();
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const documentId = url.searchParams.get("document_id");
    const disposition = url.searchParams.get("dl") === "1" ? "attachment" : "inline";

    if (!token || token.length < 16 || !documentId) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate share + get metadata
    const { data: shareData, error: shareErr } = await supabase.rpc(
      "get_document_share_by_token",
      { _token: token },
    );
    if (shareErr) throw shareErr;
    if (!shareData) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }
    const share = shareData as {
      expired: boolean;
      expires_at: string;
      recipient_label: string | null;
      owner_name: string;
      documents: Array<{ id: string; file_name: string; document_type: string }>;
    };
    if (share.expired) {
      return new Response("Link expired", { status: 410, headers: corsHeaders });
    }

    const doc = share.documents.find((d) => d.id === documentId);
    if (!doc) {
      return new Response("Document not part of share", { status: 403, headers: corsHeaders });
    }

    // Look up storage path
    const { data: pathRow, error: pathErr } = await supabase
      .from("consultant_documents")
      .select("file_url")
      .eq("id", documentId)
      .maybeSingle();
    if (pathErr || !pathRow?.file_url) {
      return new Response("File missing", { status: 404, headers: corsHeaders });
    }

    // Log download
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const ua = req.headers.get("user-agent") || null;
    supabase
      .rpc("log_document_share_view", {
        _token: token,
        _ip: ip,
        _user_agent: ua,
        _document_id: documentId,
        _action: "download",
      })
      .then(({ error }) => {
        if (error) console.error("log error", error);
      });

    // Download file from storage
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from("verifications")
      .download(pathRow.file_url);
    if (dlErr || !fileBlob) {
      return new Response("Storage error", { status: 500, headers: corsHeaders });
    }

    const arrayBuf = await fileBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    const isPdf =
      doc.file_name.toLowerCase().endsWith(".pdf") ||
      fileBlob.type === "application/pdf" ||
      (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

    let outBytes: Uint8Array = bytes;
    let contentType = fileBlob.type || "application/octet-stream";

    if (isPdf) {
      const recipient = share.recipient_label?.trim() || "Mottagare";
      const ts = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });
      const watermark = `Delat med ${recipient}`;
      const footer = `CompCare · Delat med ${recipient} · ${ts}${ip ? ` · IP ${ip}` : ""} · Endast för avtalad mottagare`;
      try {
        outBytes = await watermarkPdf(bytes, watermark, footer);
        contentType = "application/pdf";
      } catch (e) {
        console.error("watermark failed, serving original", e);
      }
    }

    const safeName = sanitizeFileName(doc.file_name);
    // BodyInit must be a real ArrayBuffer (not SharedArrayBuffer), so create a fresh one.
    const body = new Uint8Array(outBytes).buffer as ArrayBuffer;

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("download-shared-document error", err);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
