import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TABLES = new Set(["uppdragsradar_predictions", "customer_intelligence"]);

// Fields per table — anything else gets stripped (defence-in-depth)
const ALLOWED_FIELDS: Record<string, string[]> = {
  uppdragsradar_predictions: [
    "customer", "region", "profession", "specialization", "month",
    "expected_calloffs", "expected_calloffs_display",
    "seasonal_index", "yoy_ratio", "ytd_ratio", "trend_ratio",
    "confidence", "is_seasonal_peak", "is_trend_break",
  ],
  customer_intelligence: [
    "customer", "region", "profession",
    "vol_2023", "vol_2024", "vol_2025", "vol_2026_ytd",
    "yoy_ratio", "ytd_ratio", "trend_ratio", "trend_label",
    "history_months", "seasonal_peaks", "seasonal_lows", "last_calloff_date",
  ],
};

function sanitize(table: string, row: Record<string, unknown>) {
  const allowed = ALLOWED_FIELDS[table];
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in row) out[k] = row[k];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null);
    const table = body?.table as string | undefined;
    const rows = body?.rows as Array<Record<string, unknown>> | undefined;
    const truncate = body?.truncate === true;

    if (!table || !ALLOWED_TABLES.has(table)) {
      return new Response(JSON.stringify({ error: "Invalid table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows must be a non-empty array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rows.length > 5000) {
      return new Response(JSON.stringify({ error: "Max 5000 rows per request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (truncate) {
      const { error: delErr } = await service.from(table).delete().not("id", "is", null);
      if (delErr) throw delErr;
    }

    const sanitized = rows.map((r) => sanitize(table, r));

    // Insert in chunks of 500
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < sanitized.length; i += CHUNK) {
      const slice = sanitized.slice(i, i + CHUNK);
      const { error } = await service.from(table).insert(slice);
      if (error) throw error;
      inserted += slice.length;
    }

    return new Response(JSON.stringify({ ok: true, inserted, table, truncated: truncate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[radar-import] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
