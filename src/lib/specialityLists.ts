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
  "Barn- och ungdomsneurologi med habilitering",
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
export const NURSE_SPECIALIZATIONS = [
  "IVA-sjuksköterska", "Psykiatrisjuksköterska", "Ambulanssjuksköterska",
  "Barnsjuksköterska", "Operationssjuksköterska", "Anestesisjuksköterska",
  "Akutsjuksköterska", "Hjärtsjuksköterska", "Distriktssjuksköterska",
  "Kirurgsjuksköterska", "Palliativsjuksköterska", "Geriatriksjuksköterska",
  "Medicinsjuksköterska", "Onkologisjuksköterska", "Infektionssjuksköterska",
] as const;

// Maps user-facing nurse label → internal yrkeskategori (matches DB rate rows)
export const NURSE_VALUE_MAP: Record<string, string> = {
  "Akutsjuksköterska": "Specialistsjuksköterska akutsjukvård",
  "Ambulanssjuksköterska": "Specialistsjuksköterska ambulanssjukvård",
  "Anestesisjuksköterska": "Specialistsjuksköterska anestesi",
  "Barnsjuksköterska": "Specialistsjuksköterska barn och ungdom",
  "Diabetessjuksköterska": "Specialistsjuksköterska diabetesvård",
  "Distriktssjuksköterska": "Distriktssjuksköterska",
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
  "Ögonsjuksköterska": "Specialistsjuksköterska ögonsjukvård",
};

/**
 * Resolves a category + dropdown value into the canonical yrkeskategori string
 * used in DB rate lookups. Mirrors the logic previously duplicated in
 * Survey.tsx, HeroRateFinder.tsx and MarketSearchBox.tsx.
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
    if (dropdownValue === "__ovrig") return "Specialistsjuksköterska";
    return NURSE_VALUE_MAP[dropdownValue] || dropdownValue;
  }
  return "";
}
