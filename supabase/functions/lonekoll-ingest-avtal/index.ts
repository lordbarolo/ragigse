// Admin-only: read all PDFs from the `lonekoll_avtal` private bucket,
// extract text, chunk, embed, and upsert into `lonekoll_avtal_chunks`.
//
// Trigger from admin UI. Idempotent: deletes existing rows for each
// source_doc before re-inserting, so re-running is safe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_MODEL = "openai/text-embedding-3-small"; // 1536 dims
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const BUCKET = "lonekoll_avtal";

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    let slice = clean.slice(i, end);
    // try to end on a paragraph or sentence boundary
    if (end < clean.length) {
      const lastPara = slice.lastIndexOf("\n\n");
      const lastDot = slice.lastIndexOf(". ");
      const cut = lastPara > CHUNK_SIZE * 0.5 ? lastPara : lastDot > CHUNK_SIZE * 0.5 ? lastDot + 1 : -1;
      if (cut > 0) slice = slice.slice(0, cut);
    }
    chunks.push(slice.trim());
    i += Math.max(1, slice.length - CHUNK_OVERLAP);
  }
  return chunks.filter((c) => c.length > 50);
}

function guessSection(text: string): string | null {
  // Find first heading-like line: "Bilaga X", "§ N", "N.N.N <Title>"
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (/^(bilaga\s+\d+|§\s*\d+|\d+(\.\d+)+\s+\S+)/i.test(line)) {
      return line.slice(0, 120);
    }
  }
  return null;
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const resp = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Embedding failed ${resp.status}: ${t}`);
  }
  const json = await resp.json();
  return (json.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // List all files in the bucket
    const { data: files, error: listErr } = await supabase.storage.from(BUCKET).list("", {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });
    if (listErr) throw listErr;
    const pdfs = (files ?? []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));

    if (pdfs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "Inga PDF:er hittades i bucketen lonekoll_avtal." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ file: string; chunks: number; error?: string }> = [];

    for (const file of pdfs) {
      try {
        // Download PDF
        const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(file.name);
        if (dlErr || !blob) throw dlErr ?? new Error("Download failed");

        const buf = new Uint8Array(await blob.arrayBuffer());
        const pdf = await getDocumentProxy(buf);
        const { text } = await extractText(pdf, { mergePages: true });
        const fullText = Array.isArray(text) ? text.join("\n") : (text as string);

        const chunks = chunkText(fullText);
        if (chunks.length === 0) {
          results.push({ file: file.name, chunks: 0, error: "no text extracted" });
          continue;
        }

        // Delete existing rows for this source_doc
        await supabase.from("lonekoll_avtal_chunks").delete().eq("source_doc", file.name);

        // Embed in batches of 32
        const BATCH = 32;
        for (let i = 0; i < chunks.length; i += BATCH) {
          const batch = chunks.slice(i, i + BATCH);
          const vectors = await embedBatch(batch, apiKey);
          const rows = batch.map((content, idx) => ({
            source_doc: file.name,
            section: guessSection(content),
            content,
            embedding: vectors[idx] as unknown as string, // pgvector accepts JSON array
            metadata: { chunk_index: i + idx, total: chunks.length },
          }));
          const { error: insErr } = await supabase.from("lonekoll_avtal_chunks").insert(rows);
          if (insErr) throw insErr;
        }

        results.push({ file: file.name, chunks: chunks.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ingest] ${file.name} failed:`, msg);
        results.push({ file: file.name, chunks: 0, error: msg });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ingest] fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
