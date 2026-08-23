/**
 * Exporterar samtliga yrkesroller (artikelkatalogens nivå, ej kanonisk indelning)
 * för läkare, sjuksköterskor och barnmorskor ur aktiva avtalsversioner.
 *
 * Fristående skript: enda beroendet är @supabase/supabase-js.
 * Kräver tabellerna public.contract_versions och public.contract_version_rates
 * samt läsrättighet (anon/publishable key räcker om RLS tillåter SELECT).
 *
 * Användning:
 *   bunx tsx scripts/export-yrkesroller.ts [utmapp]
 *
 * Miljövariabler (första träffen används):
 *   SUPABASE_URL | VITE_SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY | VITE_SUPABASE_PUBLISHABLE_KEY | SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY
 *
 * Skriver CSV + Markdown till /mnt/documents om ingen mapp anges.
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


type Row = {
  yrkesroll: string;
  yrkesgrupp: string;
  katalog: string;
  version: string;
  typ: string;
  zon1: number | null;
  zon2: number | null;
  zon3: number | null;
};

function zonKey(zon: string): "zon1" | "zon2" | "zon3" | null {
  const m = zon.match(/([123])/);
  if (!m) return null;
  return (`zon${m[1]}` as "zon1" | "zon2" | "zon3");
}

function yrkesgrupp(katalog: string, roll: string): string {
  const l = roll.toLowerCase();
  if (l.includes("barnmorska")) return "Barnmorska";
  if (katalog.toLowerCase().includes("läkare")) return "Läkare";
  return "Sjuksköterska";
}

async function main() {
  const outDir = process.argv[2] || "/mnt/documents";

  const { data: versionsRaw, error: vErr } = await supabase
    .from("contract_versions")
    .select("id, catalog_name, version_label")
    .eq("is_active", true);
  if (vErr) throw vErr;
  const versions = (versionsRaw ?? []) as ContractVersionRow[];

  const vMap = new Map(versions.map((v) => [v.id, v]));

  const rows: Row[] = [];
  const index = new Map<string, Row>();
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
      // Endast yrkesroller: hoppa över OB-tillägg och administrativa prisgrupper.
      if (/^OB-tillägg/i.test(r.yrkeskategori)) continue;
      if (/\bGrupp [AB]\b/i.test(r.yrkeskategori)) continue;
      const katalog = v.catalog_name ?? "";
      const key = `${katalog}|${v.version_label}|${r.yrkeskategori}|${r.typ}`;
      let row = index.get(key);
      if (!row) {
        row = {
          yrkesroll: r.yrkeskategori,
          yrkesgrupp: yrkesgrupp(katalog, r.yrkeskategori),
          katalog,
          version: v.version_label ?? "",
          typ: r.typ ?? "",
          zon1: null,
          zon2: null,
          zon3: null,
        };
        index.set(key, row);
        rows.push(row);
      }
      const zk = zonKey(r.zon ?? "");
      if (zk) row[zk] = r.timpris_kund;
    }
    if (data.length < pageSize) break;
  }

  const groupOrder = { Läkare: 0, Sjuksköterska: 1, Barnmorska: 2 } as Record<string, number>;
  rows.sort(
    (a, b) =>
      (groupOrder[a.yrkesgrupp] ?? 9) - (groupOrder[b.yrkesgrupp] ?? 9) ||
      a.yrkesroll.localeCompare(b.yrkesroll, "sv"),
  );

  const header = ["yrkesroll", "yrkesgrupp", "katalog", "version", "typ", "zon1", "zon2", "zon3"];
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      header
        .map((h) => {
          const val = (r as unknown as Record<string, unknown>)[h];
          const s = val === null || val === undefined ? "" : String(val);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    ),
  ].join("\n");

  const md = [
    "# Yrkesroller i nationella avtalets artikelkatalog",
    "",
    `Totalt ${rows.length} yrkesroller. Priser = kundpris kr/h, grundpris per zon.`,
    "",
    "| Yrkesroll | Grupp | Katalog | Zon 1 | Zon 2 | Zon 3 |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${r.yrkesroll} | ${r.yrkesgrupp} | ${r.katalog} ${r.version} | ${r.zon1 ?? "–"} | ${r.zon2 ?? "–"} | ${r.zon3 ?? "–"} |`,
    ),
  ].join("\n");

  const csvPath = resolve(outDir, "yrkesroller-artikelkatalog.csv");
  const mdPath = resolve(outDir, "yrkesroller-artikelkatalog.md");
  writeFileSync(csvPath, csv, "utf8");
  writeFileSync(mdPath, md, "utf8");

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.yrkesgrupp] = (acc[r.yrkesgrupp] ?? 0) + 1;
    return acc;
  }, {});
  console.log("Antal per grupp:", counts, "Totalt:", rows.length);
  console.log("Skrev", csvPath, "och", mdPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
