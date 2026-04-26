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

// Max length for any string field (prevents DoS via huge payloads)
const MAX_STRING_LEN = 200;

// Rate limit: max imports per admin per hour
const RATE_LIMIT_PER_HOUR = 10;

function sanitize(table: string, row: Record<string, unknown>) {
  const allowed = ALLOWED_FIELDS[table];
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (!(k in row)) continue;
    const v = row[k];
    // Cap string lengths defensively
    if (typeof v === "string" && v.length > MAX_STRING_LEN) {
      out[k] = v.slice(0, MAX_STRING_LEN);
    } else {
      out[k] = v;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let userId: string | null = null;
  let table = "";
  let rowsCount = 0;
  let truncate = false;

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;
    userId = auth.userId;

    const body = await req.json().catch(() => null);
    table = (body?.table as string | undefined) ?? "";
    const rows = body?.rows as Array<Record<string, unknown>> | undefined;
    truncate = body?.truncate === true;
    const truncateConfirm = body?.truncate_confirm as string | undefined;

    if (!ALLOWED_TABLES.has(table)) {
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
    rowsCount = rows.length;

    // Truncate confirmation guard — must explicitly send the table name
    if (truncate && truncateConfirm !== table) {
      return new Response(JSON.stringify({
        error: `To truncate, set truncate_confirm to "${table}"`,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: count imports by this admin in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countErr } = await service
      .from("radar_import_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (countErr) {
      console.error("[radar-import] rate-check error", countErr.message);
    } else if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return new Response(JSON.stringify({
        error: `Rate limit exceeded: max ${RATE_LIMIT_PER_HOUR} imports per hour`,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Audit log success
    await service.from("radar_import_log").insert({
      user_id: userId,
      table_name: table,
      row_count: inserted,
      truncated: truncate,
      status: "success",
    });

    return new Response(JSON.stringify({ ok: true, inserted, table, truncated: truncate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[radar-import] error", msg);

    // Audit log failure (best effort)
    if (userId) {
      await service.from("radar_import_log").insert({
        user_id: userId,
        table_name: table || "unknown",
        row_count: rowsCount,
        truncated: truncate,
        status: "error",
        error_message: msg.slice(0, 500),
      }).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
