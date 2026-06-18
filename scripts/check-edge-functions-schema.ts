/**
 * Pre-deploy schema check.
 *
 * Scans supabase/functions for `.from("<table>").select("col, col, ...")` patterns
 * and verifies each referenced column exists in the live Supabase schema.
 *
 * Usage:
 *   bun run scripts/check-edge-functions-schema.ts
 *
 * Exits with code 1 (and prints a report) if any column is missing.
 *
 * Requires env: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read from .env).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(2);
}

const FUNCTIONS_DIR = "supabase/functions";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (entry.endsWith(".ts")) out.push(p);
  }
  return out;
}

interface Ref {
  file: string;
  line: number;
  table: string;
  columns: string[];
}

// Matches:   .from("table_name").select("col1, col2, ...")
// Tolerates whitespace + template strings.
const PATTERN = /\.from\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_]*)["'`]\s*\)\s*\.select\(\s*["'`]([^"'`]+)["'`]/g;

function extract(file: string): Ref[] {
  const src = readFileSync(file, "utf8");
  const out: Ref[] = [];
  for (const match of src.matchAll(PATTERN)) {
    const table = match[1];
    const raw = match[2];
    if (raw.trim() === "*" || raw.includes("(")) continue; // skip wildcards & nested joins
    const cols = raw
      .split(",")
      .map((c) => c.trim().split(":")[0].trim())
      .filter((c) => c && c !== "*" && !c.startsWith("count"));
    if (cols.length === 0) continue;
    const line = src.slice(0, match.index ?? 0).split("\n").length;
    out.push({ file, line, table, columns: cols });
  }
  return out;
}

async function fetchSchema(): Promise<Map<string, Set<string>>> {
  // Use information_schema via PostgREST is not exposed; use rpc-style query through PostgREST.
  // We query a SQL function we'd need to create. Simpler: hit Supabase REST /rest/v1/?select via OPTIONS not supported.
  // Fallback: pg-meta endpoint (admin API) — available with service_role key on Lovable Cloud.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_columns_for_public`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) {
    // Function doesn't exist yet — print SQL to create it.
    console.error(`\nMissing helper RPC. Create it via migration:\n`);
    console.error(`CREATE OR REPLACE FUNCTION public.pg_columns_for_public()
RETURNS TABLE(table_name text, column_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
  SELECT c.table_name::text, c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
$$;
REVOKE ALL ON FUNCTION public.pg_columns_for_public() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pg_columns_for_public() TO service_role;\n`);
    process.exit(2);
  }
  const rows: Array<{ table_name: string; column_name: string }> = await res.json();
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.table_name)) map.set(r.table_name, new Set());
    map.get(r.table_name)!.add(r.column_name);
  }
  return map;
}

const files = walk(FUNCTIONS_DIR);
const refs = files.flatMap(extract);
console.log(`Scanned ${files.length} files, ${refs.length} .from().select() calls.`);

const schema = await fetchSchema();
const missing: Array<{ ref: Ref; col: string }> = [];

for (const r of refs) {
  const cols = schema.get(r.table);
  if (!cols) continue; // unknown table (could be a view or RPC alias) — skip
  for (const c of r.columns) {
    if (c.startsWith("!") || c.startsWith("*")) continue;
    if (!cols.has(c)) missing.push({ ref: r, col: c });
  }
}

if (missing.length === 0) {
  console.log("✅ Schema check passed.");
  process.exit(0);
}

console.error(`\n❌ ${missing.length} column reference(s) not found in live schema:\n`);
for (const m of missing) {
  console.error(`  ${m.ref.file}:${m.ref.line}  →  ${m.ref.table}.${m.col}`);
}
process.exit(1);
