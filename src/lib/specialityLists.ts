/**
 * Single source of truth for doctor & nurse specialty lists used across:
 *  - Survey.tsx (full survey flow)
 *  - HeroRateFinder.tsx (landing inline picker)
 *  - MarketSearchBox.tsx (demo market search)
 *
 * Any change here must be replicated in DB rate seeds where applicable.
 */

export type RoleGroup = "lakare" | "ssk";

// ── Doctors: 63 specializations per Socialstyrelsen — alphabetical ─────────
export const DOCTOR_SPECIALTIES = [
  "Akutsjukvård",
  "Allergologi",
  "Allmänmedicin",
  "Anestesi och intensivvård",
  "Arbets- och miljömedicin",
  "Arbetsmedicin",
  "Barn- och ungdomsallergologi",
  "Barn- och ungdomshematologi och onkologi",
  "Barn- och ungdomskardiologi",
  "Barn- och ungdomskirurgi",
  "Barn- och ungdomsmedicin",
  "Barn- och ungdomsneurologi",
  "Barn- och ungdomspsykiatri",
  "Beroendemedicin",
  "Endokrinologi och diabetologi",
  "Geriatrik",
  "Gynekologisk onkologi",
  "Handkirurgi",
  "Hematologi",
  "Hörsel- och balansrubbningar",
  "Hud- och könssjukdomar",
  "Infektionssjukdomar",
  "Internmedicin",
  "Kardiologi",
  "Kirurgi",
  "Klinisk farmakologi",
  "Klinisk fysiologi",
  "Klinisk genetik",
  "Klinisk immunologi och transfusionsmedicin",
  "Klinisk kemi",
  "Klinisk mikrobiologi",
  "Klinisk neurofysiologi",
  "Klinisk patologi",
  "Kärlkirurgi",
  "Lungsjukdomar",
  "Medicinsk gastroenterologi och hepatologi",
  "Neonatologi",
  "Neuroradiologi",
  "Neurokirurgi",
  "Neurologi",
  "Njurmedicin",
  "Nuklearmedicin",
  "Obstetrik och gynekologi",
  "Onkologi",
  "Ortopedi",
  "Palliativ medicin",
  "Plastikkirurgi",
  "Psykiatri",
  "Rättsmedicin",
  "Rättspsykiatri",
  "Radiologi",
  "Rehabiliteringsmedicin",
  "Reumatologi",
  "Röst- och talrubbningar",
  "Skolhälsovård",
  "Smärtlindring",
  "Socialmedicin",
  "Thoraxkirurgi",
  "Urologi",
  "Vårdhygien",
  "Äldrepsykiatri",
  "Ögonsjukdomar",
  "Öron-, näs- och halssjukdomar",
] as const;

// ── Nurses: top specializations — ordered by search frequency ──────────────
// All entries MUST resolve to an exact role row in src/data/skrPrices2026.ts.
// Do NOT add a generic "Specialistsjuksköterska" entry — every specialty must
// map to its specific yrkeskategori so the correct SKR 2026 price applies.
export const NURSE_SPECIALIZATIONS = [
  "IVA-sjuksköterska", "Psykiatrisjuksköterska", "Ambulanssjuksköterska",
  "Barnsjuksköterska", "Operationssjuksköterska", "Anestesisjuksköterska",
  "Akutsjuksköterska", "Hjärtsjuksköterska", "Distriktssjuksköterska",
  "Kirurgsjuksköterska", "Palliativsjuksköterska", "Geriatriksjuksköterska",
  "Medicinsjuksköterska", "Onkologisjuksköterska", "Infektionssjuksköterska",
  "Diabetessjuksköterska", "Ögonsjuksköterska", "Företagshälsosjuksköterska",
  "Skolsköterska",
] as const;

// Maps user-facing nurse label → internal yrkeskategori (matches DB rate rows
// in contract_version_rates v1.7 / PRICE_BY_ROLE in src/data/skrPrices2026.ts).
export const NURSE_VALUE_MAP: Record<string, string> = {
  "Akutsjuksköterska": "Specialistsjuksköterska akutsjukvård",
  "Ambulanssjuksköterska": "Specialistsjuksköterska ambulanssjukvård",
  "Anestesisjuksköterska": "Specialistsjuksköterska anestesi",
  "Barnsjuksköterska": "Specialistsjuksköterska barn och ungdom",
  "Diabetessjuksköterska": "Specialistsjuksköterska diabetesvård",
  "Distriktssjuksköterska": "Distriktssjuksköterska",
  "Företagshälsosjuksköterska": "Specialistsjuksköterska företagshälsovård",
  "Hjärtsjuksköterska": "Specialistsjuksköterska hjärtsjukvård",
  "Infektionssjuksköterska": "Specialistsjuksköterska infektionssjukvård",
  "IVA-sjuksköterska": "Specialistsjuksköterska intensivvård",
  "Kirurgsjuksköterska": "Specialistsjuksköterska kirurgisk vård",
  "Medicinsjuksköterska": "Specialistsjuksköterska medicinsk vård",
  "Onkologisjuksköterska": "Specialistsjuksköterska onkologisk vård",
  "Operationssjuksköterska": "Specialistsjuksköterska operationssjukvård",
  "Palliativsjuksköterska": "Specialistsjuksköterska palliativ vård",
  "Psykiatrisjuksköterska": "Specialistsjuksköterska psykiatrisk vård",
  "Geriatriksjuksköterska": "Specialistsjuksköterska vård av äldre",
  "Skolsköterska": "Skolsköterska",
  "Ögonsjuksköterska": "Specialistsjuksköterska ögonsjukvård",
};

/**
 * Sentinel used when a nurse can't find their specialty in the list. Callers
 * MUST treat this as "no price available" and route the user to a contact
 * surface — never fall back to a generic specialist price.
 */
export const NURSE_MISSING_SPECIALTY = "__SPECIALITY_MISSING__";

/**
 * Resolves a category + dropdown value into the canonical yrkeskategori string
 * used in DB rate lookups. Mirrors the logic previously duplicated in
 * Survey.tsx, HeroRateFinder.tsx and MarketSearchBox.tsx.
 *
 * Returns NURSE_MISSING_SPECIALTY for the "Min specialitet saknas" choice so
 * callers can render a "Pris saknas — kontakta oss" surface instead of
 * silently falling back to a generic "Specialistsjuksköterska" price.
 */
export function resolveYrke(category: RoleGroup, dropdownValue: string): string {
  if (!dropdownValue) return "";
  if (category === "lakare") {
    if (dropdownValue === "__leg") return "Legitimerad läkare";
    if (dropdownValue === "__st") return "ST-läkare";
    if (dropdownValue === "__ovrig") return "Specialistläkare";
    return `Specialistläkare ${dropdownValue.toLowerCase()}`;
  }
  if (category === "ssk") {
    if (dropdownValue === "__allman") return "Sjuksköterska";
    if (dropdownValue === "__barnmorska") return "Barnmorska";
    if (dropdownValue === "__rontgen") return "Röntgensjuksköterska";
    if (dropdownValue === "__ovrig" || dropdownValue === "__saknas") {
      return NURSE_MISSING_SPECIALTY;
    }
    return NURSE_VALUE_MAP[dropdownValue] || dropdownValue;
  }
  return "";
}

