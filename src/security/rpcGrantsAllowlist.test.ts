/**
 * Steg 7: skyddar mot "grants-fällan".
 *
 * Testet skannar alla migrationsfiler efter `CREATE FUNCTION public.<namn>` och
 * kräver att varje funktion finns i `FUNCTION_GRANTS` med en explicit kategori.
 * En ny databasfunktion utan ställningstagande gör testet rött.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FUNCTION_GRANTS } from "./rpcGrantsAllowlist";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function functionsInMigrations(): string[] {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  const found = new Set<string>();
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z0-9_]+)"?/gi;
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    for (const match of sql.matchAll(re)) {
      const name = match[1]?.toLowerCase();
      // Hoppa över funktioner i andra scheman (extensions m.m.)
      if (name) found.add(name);
    }
  }
  return [...found].sort();
}

describe("RPC-grants · allowlist täcker varje databasfunktion", () => {
  const declared = functionsInMigrations();

  it("hittar funktioner i migrationerna", () => {
    expect(declared.length).toBeGreaterThan(10);
  });

  it("varje funktion har ett explicit grant-beslut", () => {
    const missing = declared.filter((fn) => !(fn in FUNCTION_GRANTS));
    expect(
      missing,
      `Följande funktioner saknar beslut i src/security/rpcGrantsAllowlist.ts: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("allowlisten innehåller inga borttagna funktioner", () => {
    const stale = Object.keys(FUNCTION_GRANTS).filter((fn) => !declared.includes(fn));
    expect(
      stale,
      `Följande poster i allowlisten finns inte i migrationerna: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("varje kategori är ett känt värde", () => {
    for (const [fn, cat] of Object.entries(FUNCTION_GRANTS)) {
      expect(["anon", "authenticated", "internal"], `okänd kategori för ${fn}`).toContain(cat);
    }
  });
});
