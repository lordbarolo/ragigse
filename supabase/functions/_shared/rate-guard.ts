/**
 * rate-guard — delad grund för alla flöden som visar möjlig ersättning.
 *
 * Tre regler som varje flöde måste ärva i stället för att duplicera:
 *   1. Zonen slås ALLTID upp mot `locations`/`regions`. Ingen gissning, ingen
 *      "ta första raden"-fallback — saknas mappning returneras null.
 *   2. Ersättningsspannet räknas fram i kod (marginalandel + arbetsgivarfaktor),
 *      aldrig av en språkmodell.
 *   3. Råa kundpriser och beräkningsmodellen får aldrig nå ett användarsvar.
 *      `leaksForbiddenData` fångar det som ändå slinker igenom.
 *
 * Marginalmodellen speglar _shared/calc.ts (och src/lib/calc.ts).
 */

import {
  EMPLOYER_FACTOR,
  isSpecialistDoctor,
  SPECIALIST_DOCTOR_SHARE_MAX,
  SPECIALIST_DOCTOR_SHARE_MIN,
  STANDARD_SHARE_MAX,
  STANDARD_SHARE_MIN,
} from "./calc.ts";

export { EMPLOYER_FACTOR };

/**
 * Intern andelsmodell — får aldrig beskrivas i svar till användaren.
 * Endast specialistläkare har den högre andelen; leg. läkare och ST-läkare
 * följer standardmodellen. Samma predikat som frontend (`getMarginShares`).
 */
export function shareRange(role: string): [number, number] {
  return isSpecialistDoctor(role)
    ? [SPECIALIST_DOCTOR_SHARE_MIN, SPECIALIST_DOCTOR_SHARE_MAX]
    : [STANDARD_SHARE_MIN, STANDARD_SHARE_MAX];
}

/** true när anställningsformen innebär att arbetsgivarkostnaden ska räknas av. */
export function isEmployed(employmentType?: string | null): boolean {
  return employmentType === "anstalld";
}

export const formatKr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr/h`;
export const formatPlain = (n: number) => Math.round(n).toLocaleString("sv-SE");

/**
 * Kommun → zon. Två källor (`locations`, därefter `regions`), annars null.
 * Returnerar ALDRIG en gissad zon: utan träff ska anropande flöde be om
 * kompletterande uppgift i stället för att visa belopp för fel zon.
 */
export async function resolveZone(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  kommun: string | null | undefined,
): Promise<string | null> {
  if (!kommun) return null;
  const name = kommun.trim().replace(/\s+kommun$/i, "");
  if (!name) return null;

  const { data: locRows } = await supabase
    .from("locations")
    .select("zon")
    .ilike("kommun", name);
  const fromLoc = ((locRows ?? [])[0] as { zon?: string } | undefined)?.zon ?? null;
  if (fromLoc) return fromLoc;

  const { data: regRows } = await supabase
    .from("regions")
    .select("zon")
    .ilike("kommun", name);
  return ((regRows ?? [])[0] as { zon?: string } | undefined)?.zon ?? null;
}

export interface PossibleRange {
  /** Nedre gränsen för möjlig ersättning, kr/h. */
  min: number;
  /** Övre gränsen för möjlig ersättning, kr/h. */
  max: number;
}

/**
 * Möjlig ersättning ur regionens kundpris. Marginalen är redan avdragen och
 * anställda räknas om med arbetsgivarfaktorn. Endast dessa belopp får visas.
 */
export function possibleRange(
  customerPrice: number,
  role: string,
  employmentType?: string | null,
): PossibleRange {
  const [shareLo, shareHi] = shareRange(role);
  const factor = isEmployed(employmentType) ? EMPLOYER_FACTOR : 1;
  return {
    min: Math.round((customerPrice * shareLo) / factor),
    max: Math.round((customerPrice * shareHi) / factor),
  };
}

/** Aldrig under vad användaren redan har. */
export function withFloor(range: PossibleRange, currentRate?: number | null): PossibleRange {
  if (!currentRate || currentRate <= range.min) return range;
  return { min: currentRate, max: Math.max(range.max, currentRate) };
}

/** Standardsvar när modellen inte får redovisas. */
export const MODEL_NOT_DISCLOSED =
  "Beräkningen utgår från regionernas ramavtal. Modellen bakom beloppen redovisas inte.";

/** Deterministisk följdfråga när underlag saknas — aldrig belopp. */
export function missingDataAnswer(missing: string[]): string {
  const what = missing.length ? missing.join(" och ") : "vilken roll och ort frågan gäller";
  return (
    "Jag saknar underlag för att räkna på det här utan att gissa. " +
    `Kan du berätta ${what}? Då visar jag möjlig ersättning direkt.`
  );
}

/**
 * Utgångsspärr. true när texten läcker ett rått kundpris, nämner
 * ramavtalspris/regionens pris tillsammans med en siffra, avslöjar
 * beräkningsmodellen — eller innehåller belopp trots att underlag saknas.
 */
export function leaksForbiddenData(
  text: string | null | undefined,
  opts: { forbiddenAmounts?: number[]; hasRateContext?: boolean } = {},
): boolean {
  if (!text) return false;
  const normalized = text.replace(/\u00a0/g, " ");
  const amounts = opts.forbiddenAmounts ?? [];

  const leaksAmount = amounts.some((amount) =>
    new RegExp(
      `\\b${Math.round(amount).toString().replace(/(\d)(\d{3})$/, "$1[\\s\u00a0]?$2")}\\b`,
    ).test(normalized)
  );
  if (leaksAmount) return true;

  if (/ramavtalspris\w*[^.]{0,40}\d/i.test(normalized)) return true;
  if (/regionens pris[^.]{0,40}\d/i.test(normalized)) return true;
  if (/kundpris\w*[^.]{0,40}\d/i.test(normalized)) return true;
  // Beräkningsmodellen: marginalprocent och omräkningsfaktorer.
  if (/margina\w*[^.]{0,40}\d\s*[–\-]?\s*\d*\s*%/i.test(normalized)) return true;
  if (/\b1[.,]38\b/.test(normalized)) return true;
  if (/\b167\s*(timmar|h\b)/i.test(normalized)) return true;

  // Utan underlag får inga belopp alls förekomma.
  if (opts.hasRateContext === false && /\d[\d\s\u00a0.,]*\s*(kr|kronor|sek)/i.test(normalized)) {
    return true;
  }
  return false;
}
