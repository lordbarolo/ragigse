/**
 * Publika ramavtalspriser för startsidan (utloggat läge).
 *
 * Läser `contract_version_rates` för aktiv avtalsversion. Båda tabellerna är
 * publikt läsbara (RLS `USING (true)` för anon), så detta fungerar utan inloggning.
 *
 * Marginalmodellen är INTE duplicerad här — den hämtas från `@/lib/calc`, som är
 * single source of truth för hela appen.
 */

import { supabase } from "@/integrations/supabase/client";
import { getMarginShares, EMPLOYER_FACTOR } from "@/lib/calc";

export interface ContractRate {
  yrkeskategori: string;
  zon: string;
  timpris_kund: number;
}

export interface RoleRateCard {
  role: string;
  zone: string;
  /** Kundpris/h enligt ramavtalet. */
  customerRate: number;
  /** Vad konsulten får som företagare (kundpris × marginalandel). */
  foretagare: number;
  /** Motsvarande timlön som anställd (företagarbeloppet / arbetsgivarfaktorn). */
  lontagare: number;
}

/** Avrundning till närmaste femtal — samma visningsprecision som designen. */
function roundTo5(value: number): number {
  return Math.round(value / 5) * 5;
}

/** Formaterar ett timpris med svenskt tusentalsavgränsare, t.ex. "1 330". */
export function formatRate(value: number): string {
  return Math.round(value).toLocaleString("sv-SE").replace(/ /g, " ");
}

/**
 * Hämtar alla prisrader för aktiv avtalsversion.
 * Kastar vid fel så anropande komponent kan visa ett synligt feltillstånd
 * i stället för att tyst rendera ingenting.
 */
export async function fetchActiveContractRates(): Promise<ContractRate[]> {
  const { data: versions, error: versionError } = await supabase
    .from("contract_versions")
    .select("id")
    .eq("is_active", true);

  if (versionError) throw new Error(versionError.message);

  const versionIds = (versions ?? []).map((v) => v.id);
  if (versionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("contract_version_rates")
    .select("yrkeskategori, zon, timpris_kund")
    .in("version_id", versionIds);

  if (error) throw new Error(error.message);

  return (data ?? []).filter(
    (r): r is ContractRate =>
      typeof r.yrkeskategori === "string" &&
      typeof r.zon === "string" &&
      typeof r.timpris_kund === "number"
  );
}

/** Räknar om ett kundpris till konsultens ersättning enligt appens marginalmodell. */
export function toRateCard(rate: ContractRate): RoleRateCard {
  const { share_min, share_max } = getMarginShares(rate.yrkeskategori);
  const shareMid = (share_min + share_max) / 2;
  const foretagare = roundTo5(rate.timpris_kund * shareMid);

  return {
    role: rate.yrkeskategori,
    zone: rate.zon,
    customerRate: rate.timpris_kund,
    foretagare,
    lontagare: roundTo5(foretagare / EMPLOYER_FACTOR),
  };
}

/**
 * Roller som visas först i prisbandet när de finns i datan.
 * Matchas skiftlägesokänsligt som delsträng — datan styr, inte listan,
 * så bandet blir aldrig tomt av att ett rollnamn ändrats i databasen.
 */
const PREFERRED_ROLE_ORDER = [
  "anestesi",
  "intensivvård",
  "geriatrik",
  "operationssjukvård",
  "allmänmedicin",
  "barnmorska",
  "psykiatri",
  "akutsjukvård",
  "distriktssköterska",
  "distriktssjuksköterska",
  "kirurg",
  "radiolog",
  "sjuksköterska",
  "röntgensjuksköterska",
  "barn och ungdom",
];

function preferenceIndex(role: string): number {
  const normalized = role.toLowerCase();
  const idx = PREFERRED_ROLE_ORDER.findIndex((p) => normalized.includes(p));
  return idx === -1 ? PREFERRED_ROLE_ORDER.length : idx;
}

/** Väljer representativ zon för en roll — Zon 2 om den finns, annars lägsta zonen. */
function pickRepresentative(rows: ContractRate[]): ContractRate {
  const zone2 = rows.find((r) => r.zon.includes("2"));
  if (zone2) return zone2;
  return [...rows].sort((a, b) => a.zon.localeCompare(b.zon, "sv"))[0];
}

/**
 * Bygger korten till prisbandet: en rad per roll, sorterad efter
 * preferensordningen ovan och därefter alfabetiskt.
 */
export function buildRateCards(rates: ContractRate[], limit = 15): RoleRateCard[] {
  const byRole = new Map<string, ContractRate[]>();
  for (const rate of rates) {
    const existing = byRole.get(rate.yrkeskategori);
    if (existing) existing.push(rate);
    else byRole.set(rate.yrkeskategori, [rate]);
  }

  return [...byRole.entries()]
    .map(([, rows]) => pickRepresentative(rows))
    .sort((a, b) => {
      const diff = preferenceIndex(a.yrkeskategori) - preferenceIndex(b.yrkeskategori);
      if (diff !== 0) return diff;
      return a.yrkeskategori.localeCompare(b.yrkeskategori, "sv");
    })
    .slice(0, limit)
    .map(toRateCard);
}
