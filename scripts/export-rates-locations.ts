/**
 * Exporterar aktiva avtalsversioners priser (contract_version_rates)
 * samt kommuner/zoner (locations) till JSON.
 *
 * Användning:
 *   bunx tsx scripts/export-rates-locations.ts [sökväg]
 *
 * Standardutdata skrivs till /mnt/documents/export-rates-locations.json
 * om ingen sökväg anges.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";
import type { Database } from "../src/integrations/supabase/types";

const SUPABASE_URL = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
const SUPABASE_KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Saknar SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY i miljön.");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: versions, error: vErr } = await supabase
    .from("contract_versions")
    .select("id, catalog_name, version_label, effective_from, imported_at")
    .eq("is_active", true)
    .order("catalog_name", { ascending: true });

  if (vErr) throw vErr;
  if (!versions || versions.length === 0) {
    console.error("Inga aktiva avtalsversioner hittades.");
    process.exit(1);
  }

  const versionIds = versions.map((v) => v.id);

  const [{ data: rates, error: rErr }, { data: locations, error: lErr }] = await Promise.all([
    supabase
      .from("contract_version_rates")
      .select("id, version_id, yrkeskategori, zon, typ, timpris_kund, detaljer")
      .in("version_id", versionIds)
      .order("yrkeskategori", { ascending: true })
      .order("zon", { ascending: true })
      .order("typ", { ascending: true }),
    supabase
      .from("locations")
      .select("id, kommun, region, zon, lat, lng")
      .order("region", { ascending: true })
      .order("kommun", { ascending: true }),
  ]);

  if (rErr) throw rErr;
  if (lErr) throw lErr;

  const ratesByVersion: Record<string, typeof rates> = {};
  for (const v of versions) {
    ratesByVersion[v.id] = (rates ?? []).filter((r) => r.version_id === v.id);
  }

  const payload = {
    exported_at: new Date().toISOString(),
    active_versions: versions,
    rates_by_version: ratesByVersion,
    locations: locations ?? [],
    meta: {
      total_versions: versions.length,
      total_rates: rates?.length ?? 0,
      total_locations: locations?.length ?? 0,
    },
  };

  const json = JSON.stringify(payload, null, 2);

  const outPath = process.argv[2]
    ? resolve(process.argv[2])
    : "/mnt/documents/export-rates-locations.json";

  writeFileSync(outPath, json, "utf-8");
  console.log(`Export klar: ${outPath}`);
  console.log(
    `Versioner: ${payload.meta.total_versions}, rader: ${payload.meta.total_rates}, kommuner: ${payload.meta.total_locations}`
  );
}

main().catch((err) => {
  console.error("Export misslyckades:", err);
  process.exit(1);
});
