/**
 * Isolerade hjälpfunktioner för startsidan (5c).
 *
 * VIKTIGT: denna fil får ALDRIG importera marginalmodellen (@/lib/calc).
 * Kundpriset (SKR:s ramavtal) är offentlig data och räknas ut här; all
 * ersättningsberäkning sker server-side i src/lib/rates.server.ts.
 */
import { filterPublicRoles } from "@/lib/roleVisibility";


export interface RateRow {
  yrkeskategori: string;
  zon: string;
  typ: string;
  timpris_kund: number;
}

/** Ersättningsnivåer — hämtas från servern, bara för inloggade. */
export interface Comp5c {
  foretagareKrH: number;
  lontagareKrH: number;
  margin_text: string;
}

export const ZONES_5C = [
  { value: "Zon 1", label: "Zon 1 · Storstad", column: "Zon 1 Storstad" },
  { value: "Zon 2", label: "Zon 2 · Mellannorrland", column: "Zon 2 Mellannorrl." },
  { value: "Zon 3", label: "Zon 3 · Glesbygd", column: "Zon 3 Glesbygd" },
];

export const DEFAULT_ROLE_5C = "Specialistsjuksköterska intensivvård";
export const DEFAULT_ZONE_5C = "Zon 2";

export function basePrices(rows: unknown): RateRow[] {
  if (!Array.isArray(rows)) return [];
  return (rows as RateRow[]).filter((r) => r?.typ === "Grundpris");
}

export function roleOptions5c(rows: RateRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) if (r.yrkeskategori) set.add(r.yrkeskategori);
  // Interna administrativa gruppnamn ("… Grupp A") får aldrig exponeras publikt.
  return filterPublicRoles(Array.from(set), (r) => r).sort((a, b) => a.localeCompare(b, "sv"));
}

/** Kundpris enligt ramavtalet — offentligt, får visas för utloggade. */
export function clientPrice5c(
  rows: RateRow[],
  yrkeskategori: string,
  zon: string
): number | null {
  const row = rows.find((r) => r.yrkeskategori === yrkeskategori && r.zon === zon);
  return typeof row?.timpris_kund === "number" ? row.timpris_kund : null;
}

export function kr(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("sv-SE");
}

