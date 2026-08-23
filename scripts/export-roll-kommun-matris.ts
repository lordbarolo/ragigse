/**
 * Kopplar varje yrkesroll i artikelkatalogen (aktiva avtalsversioner) till
 * aktuellt kundpris för varje kommun, via kommunens zon.
 *
 * Fristående skript: enda beroendet är @supabase/supabase-js.
 * Kräver tabellerna public.contract_versions, public.contract_version_rates
 * och public.locations (kommun, zon, region) samt SELECT-rättighet.
 *
 * Användning:
 *   bunx tsx scripts/export-roll-kommun-matris.ts [utmapp]
 *
 * Miljövariabler (första träffen används):
 *   SUPABASE_URL | VITE_SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY | VITE_SUPABASE_PUBLISHABLE_KEY | SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY
 *
 * Skriver CSV + JSON till /mnt/documents om ingen mapp anges.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
const SUPABASE_KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["SUPABASE_ANON_KEY"] ||
  process.env["VITE_SUPABASE_ANON_KEY"];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Saknar SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY i miljön (se kommentaren högst upp i filen).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Radformer skriptet läser — hålls lokala så filen är projektoberoende. */
type ContractVersionRow = { id: string; catalog_name: string | null; version_label: string | null };
type ContractRateRow = {
  version_id: string;
  yrkeskategori: string;
  zon: string | null;
  typ: string | null;
  timpris_kund: number | null;
};
type LocationRow = { kommun: string; zon: string; region: string | null };


type ZonKey = "zon1" | "zon2" | "zon3";

type Roll = {
  yrkesroll: string;
  yrkesgrupp: string;
  katalog: string;
  version: string;
  typ: string;
  priser: Record<ZonKey, number | null>;
};

function zonKey(zon: string): ZonKey | null {
  const m = zon.match(/([123])/);
  if (!m) return null;
  return `zon${m[1]}` as ZonKey;
}

function yrkesgrupp(katalog: string, roll: string): string {
  const l = roll.toLowerCase();
  if (l.includes("barnmorska")) return "Barnmorska";
  if (katalog.toLowerCase().includes("läkare")) return "Läkare";
  return "Sjuksköterska";
}

async function fetchRoller(): Promise<Roll[]> {
  const { data: versionsRaw, error: vErr } = await supabase
    .from("contract_versions")
    .select("id, catalog_name, version_label")
    .eq("is_active", true);
  if (vErr) throw vErr;
  const versions = (versionsRaw ?? []) as ContractVersionRow[];
  const vMap = new Map(versions.map((v) => [v.id, v]));

  const roller: Roll[] = [];
  const index = new Map<string, Roll>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: dataRaw, error } = await supabase
      .from("contract_version_rates")
      .select("version_id, yrkeskategori, zon, typ, timpris_kund")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const data = (dataRaw ?? []) as ContractRateRow[];
    if (data.length === 0) break;


    for (const r of data) {
      const v = vMap.get(r.version_id);
      if (!v) continue;
      if (/^OB-tillägg/i.test(r.yrkeskategori)) continue;
      if (/\bGrupp [AB]\b/i.test(r.yrkeskategori)) continue;
      const katalog = v.catalog_name ?? "";
      const key = `${katalog}|${v.version_label}|${r.yrkeskategori}|${r.typ}`;
      let roll = index.get(key);
      if (!roll) {
        roll = {
          yrkesroll: r.yrkeskategori,
          yrkesgrupp: yrkesgrupp(katalog, r.yrkeskategori),
          katalog,
          version: v.version_label ?? "",
          typ: r.typ ?? "",
          priser: { zon1: null, zon2: null, zon3: null },
        };
        index.set(key, roll);
        roller.push(roll);
      }
      const zk = zonKey(r.zon ?? "");
      if (zk) roll.priser[zk] = r.timpris_kund;
    }
    if (data.length < pageSize) break;
  }
  return roller;
}

async function fetchKommuner() {
  const rows: { kommun: string; zon: string; region: string | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("locations")
      .select("kommun, zon, region")
      .order("kommun")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) rows.push({ kommun: r.kommun, zon: r.zon, region: r.region });
    if (data.length < pageSize) break;
  }
  return rows;
}

async function main() {
  const outDir = process.argv[2] || "/mnt/documents";
  const [roller, kommuner] = await Promise.all([fetchRoller(), fetchKommuner()]);

  const groupOrder: Record<string, number> = { Läkare: 0, Sjuksköterska: 1, Barnmorska: 2 };
  roller.sort(
    (a, b) =>
      (groupOrder[a.yrkesgrupp] ?? 9) - (groupOrder[b.yrkesgrupp] ?? 9) ||
      a.yrkesroll.localeCompare(b.yrkesroll, "sv"),
  );
  kommuner.sort((a, b) => a.kommun.localeCompare(b.kommun, "sv"));

  type Par = {
    yrkesroll: string;
    yrkesgrupp: string;
    katalog: string;
    version: string;
    kommun: string;
    region: string;
    zon: string;
    timpris_kund: number | null;
  };

  const par: Par[] = [];
  let saknadePriser = 0;
  const saknadZon = new Set<string>();

  for (const roll of roller) {
    for (const k of kommuner) {
      const zk = zonKey(k.zon ?? "");
      if (!zk) {
        saknadZon.add(k.kommun);
        continue;
      }
      const pris = roll.priser[zk];
      if (pris === null || pris === undefined) saknadePriser++;
      par.push({
        yrkesroll: roll.yrkesroll,
        yrkesgrupp: roll.yrkesgrupp,
        katalog: `${roll.katalog} ${roll.version}`.trim(),
        version: roll.version,
        kommun: k.kommun,
        region: k.region ?? "",
        zon: k.zon,
        timpris_kund: pris ?? null,
      });
    }
  }

  const header = [
    "yrkesroll",
    "yrkesgrupp",
    "katalog",
    "kommun",
    "region",
    "zon",
    "timpris_kund",
  ] as const;
  const csv = [
    header.join(","),
    ...par.map((p) =>
      header
        .map((h) => {
          const val = (p as unknown as Record<string, unknown>)[h];
          const s = val === null || val === undefined ? "" : String(val);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    ),
  ].join("\n");

  const json = {
    genererad: new Date().toISOString(),
    kalla: "contract_version_rates (aktiva versioner) + locations",
    antal_yrkesroller: roller.length,
    antal_kommuner: kommuner.length,
    antal_kombinationer: par.length,
    yrkesroller: roller.map((r) => ({
      yrkesroll: r.yrkesroll,
      yrkesgrupp: r.yrkesgrupp,
      katalog: `${r.katalog} ${r.version}`.trim(),
      zonpriser: r.priser,
    })),
    kommuner: kommuner.map((k) => ({ kommun: k.kommun, region: k.region ?? "", zon: k.zon })),
    kombinationer: par,
  };

  const csvPath = resolve(outDir, "roll-kommun-prismatris.csv");
  const jsonPath = resolve(outDir, "roll-kommun-prismatris.json");
  writeFileSync(csvPath, csv, "utf8");
  writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf8");

  console.log(
    `Yrkesroller: ${roller.length}, kommuner: ${kommuner.length}, kombinationer: ${par.length}`,
  );
  if (saknadePriser) console.log(`Kombinationer utan pris för zonen: ${saknadePriser}`);
  if (saknadZon.size) console.log(`Kommuner utan zon: ${[...saknadZon].join(", ")}`);
  console.log("Skrev", csvPath, "och", jsonPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
