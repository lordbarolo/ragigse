/**
 * pricing.ts — EN väg för prisberäkning i frontend.
 *
 * Speglar `supabase/functions/_shared/rate-guard.ts` exakt. All frontend-kod som
 * ska visa möjlig ersättning ur ett kundpris MÅSTE gå via `possibleRange` eller
 * `midRate` här — aldrig egna multiplikationer med marginalandelar eller
 * arbetsgivarfaktorn. Zonpriser hämtas via `fetchZoneRates` (en fetcher, inte
 * en per hook), så en katalogändring slår igenom på samma sätt överallt.
 *
 * Regler (från affärsmodellen):
 *   - Specialistläkare: konsult 85–90 % av kundpriset
 *   - Övriga roller:    konsult 80–85 % av kundpriset
 *   - Anställd: beloppet divideras med arbetsgivarfaktorn
 */

import { supabase } from "@/integrations/supabase/client";
import {
  EMPLOYER_FACTOR,
  HOURS_PER_MONTH,
  getMarginShares,
  type EmploymentType,
} from "@/lib/calc";

export { EMPLOYER_FACTOR, HOURS_PER_MONTH, getMarginShares };
export type { EmploymentType };

export interface PossibleRange {
  /** Nedre gränsen för möjlig ersättning, kr/h. */
  min: number;
  /** Övre gränsen för möjlig ersättning, kr/h. */
  max: number;
}

/** Marginalandelar för en roll, som par. Samma modell som backend. */
export function shareRange(role: string | null | undefined): [number, number] {
  const { share_min, share_max } = getMarginShares(role);
  return [share_min, share_max];
}

/** true när anställningsformen innebär att arbetsgivarkostnaden ska räknas av. */
export function isEmployed(employmentType?: string | null): boolean {
  return employmentType === "anstalld";
}

/**
 * Möjlig ersättning ur ett kundpris. Marginalen är avdragen och anställda
 * räknas om med arbetsgivarfaktorn. Endast dessa belopp får visas.
 */
export function possibleRange(
  customerPrice: number,
  role: string | null | undefined,
  employmentType?: string | null,
  employerFactor: number = EMPLOYER_FACTOR,
): PossibleRange {
  const [shareLo, shareHi] = shareRange(role);
  const factor = isEmployed(employmentType) ? employerFactor : 1;
  return {
    min: Math.round((customerPrice * shareLo) / factor),
    max: Math.round((customerPrice * shareHi) / factor),
  };
}

/** Mittpunkten i spannet — för ytor som visar ett enda belopp. */
export function midRate(
  customerPrice: number,
  role: string | null | undefined,
  employmentType?: string | null,
  employerFactor: number = EMPLOYER_FACTOR,
): number {
  const [shareLo, shareHi] = shareRange(role);
  const factor = isEmployed(employmentType) ? employerFactor : 1;
  return Math.round((customerPrice * ((shareLo + shareHi) / 2)) / factor);
}

/** Aldrig under vad användaren redan har. */
export function withFloor(range: PossibleRange, currentRate?: number | null): PossibleRange {
  if (!currentRate || currentRate <= range.min) return range;
  return { min: currentRate, max: Math.max(range.max, currentRate) };
}

// ── Zonpriser ur katalogen ───────────────────────────────────────────────────

export interface ZoneRates {
  zone1: number;
  zone2: number;
  zone3: number;
}

/**
 * Grundpriser per zon för en yrkeskategori i en given ramavtalsversion.
 * Returnerar null om någon zon saknas — ingen gissning, ingen "ta första raden".
 */
export async function fetchZoneRates(
  role: string,
  versionLabel: string,
): Promise<ZoneRates | null> {
  if (!role) return null;

  const { data, error } = await supabase
    .from("contract_version_rates")
    .select("yrkeskategori, zon, timpris_kund, contract_versions!inner(version_label)")
    .ilike("yrkeskategori", role)
    .eq("typ", "Grundpris")
    .eq("contract_versions.version_label", versionLabel);

  if (error || !data || data.length === 0) return null;

  const byZone: Record<string, number> = {};
  for (const row of data as unknown as { zon: string; timpris_kund: number }[]) {
    byZone[row.zon] = row.timpris_kund;
  }
  const zone1 = byZone["Zon 1"];
  const zone2 = byZone["Zon 2"];
  const zone3 = byZone["Zon 3"];
  if (zone1 == null || zone2 == null || zone3 == null) return null;

  return { zone1, zone2, zone3 };
}
