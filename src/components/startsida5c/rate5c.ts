/**
 * Isolerade hjälpfunktioner för /demo/startsida-5c.
 * Alla siffror räknas fram från tabellen `rates` (typ = "Grundpris")
 * med produktionens marginalmodell i @/lib/calc. Inga hårdkodade priser.
 */
import { getMarginShares, EMPLOYER_FACTOR } from "@/lib/calc";

export interface RateRow {
  yrkeskategori: string;
  zon: string;
  typ: string;
  timpris_kund: number;
}

export interface Rate5c {
  timpris_kund: number;
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


export function computeRate5c(
  rows: RateRow[],
  yrkeskategori: string,
  zon: string
): Rate5c | null {
  const row = rows.find((r) => r.yrkeskategori === yrkeskategori && r.zon === zon);
  if (!row || typeof row.timpris_kund !== "number") return null;

  const { share_min, share_max, margin_text } = getMarginShares(yrkeskategori);
  const shareMid = (share_min + share_max) / 2;
  const foretagareKrH = Math.round(row.timpris_kund * shareMid);
  const lontagareKrH = Math.round(foretagareKrH / EMPLOYER_FACTOR);

  return { timpris_kund: row.timpris_kund, foretagareKrH, lontagareKrH, margin_text };
}

export function marginText5c(yrkeskategori: string): string {
  return getMarginShares(yrkeskategori).margin_text;
}

export function kr(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("sv-SE");
}
