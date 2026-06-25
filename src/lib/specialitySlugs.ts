// Shared specialty list & slug helpers used by hero inline-form and Survey prefill.
// Mirrors the lists in src/components/Survey.tsx so the hero can redirect with
// ?yrke=<slug> into the survey, which then resolves the slug via PREFILL_MAP.

export type SpecialityCategory = "lakare" | "ssk";

export interface SpecialityOption {
  slug: string;
  label: string; // fullt namn — används för sökning
  displayLabel: string; // kort namn — visas i UI (en rad på mobil)
  category: SpecialityCategory;
  resolvedRole: string; // matches Survey's resolvedYrke output
}

// Mappning fullt namn → kort visningsetikett. Sökning matchar fortfarande fullt namn.
const DISPLAY_LABEL_OVERRIDES: Record<string, string> = {
  "Specialistläkare anestesi och intensivvård": "Anestesi & IVA",
  "Specialistläkare arbets- och miljömedicin": "Arbets- & miljömedicin",
  "Specialistläkare barn- och ungdomsallergologi": "Barnallergologi",
  "Specialistläkare barn- och ungdomshematologi och onkologi": "Barnhematologi & onkologi",
  "Specialistläkare barn- och ungdomskardiologi": "Barnkardiologi",
  "Specialistläkare barn- och ungdomskirurgi": "Barnkirurgi",
  "Specialistläkare barn- och ungdomsmedicin": "Barnmedicin",
  "Specialistläkare barn- och ungdomsneurologi": "Barnneurologi",
  "Specialistläkare barn- och ungdomspsykiatri": "Barn- & ungdomspsykiatri",
  "Specialistläkare endokrinologi och diabetologi": "Endokrinologi & diabetes",
  "Specialistläkare gynekologisk onkologi": "Gyn. onkologi",
  "Specialistläkare hud- och könssjukdomar": "Hud & kön",
  "Specialistläkare hörsel- och balansrubbningar": "Hörsel & balans",
  "Specialistläkare klinisk immunologi och transfusionsmedicin": "Klinisk immunologi",
  "Specialistläkare medicinsk gastroenterologi och hepatologi": "Gastroenterologi & hepatologi",
  "Specialistläkare obstetrik och gynekologi": "Obstetrik & gynekologi",
  "Specialistläkare röst- och talrubbningar": "Röst & tal",
  "Specialistläkare öron-, näs- och halssjukdomar": "ÖNH",
};

const shortenDoctorLabel = (fullLabel: string, rawSpecialty: string): string => {
  if (DISPLAY_LABEL_OVERRIDES[fullLabel]) return DISPLAY_LABEL_OVERRIDES[fullLabel];
  // Default: strippa "Specialistläkare " och ersätt " och " med " & "
  const stripped = rawSpecialty.replace(/\s+och\s+/g, " & ");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
};


const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Doctors — generic + 63 specialties. Resolved role mirrors Survey.tsx logic.
const DOCTOR_GENERIC: Array<[string, string]> = [
  ["Legitimerad läkare", "Legitimerad läkare"],
  ["ST-läkare", "ST-läkare"],
];

const DOCTOR_SPECIALTIES = [
  "Akutsjukvård", "Allergologi", "Allmänmedicin", "Anestesi och intensivvård",
  "Arbetsmedicin", "Arbets- och miljömedicin", "Barn- och ungdomsallergologi",
  "Barn- och ungdomshematologi och onkologi", "Barn- och ungdomskardiologi",
  "Barn- och ungdomskirurgi", "Barn- och ungdomsmedicin",
  "Barn- och ungdomsneurologi", "Barn- och ungdomspsykiatri",
  "Beroendemedicin", "Endokrinologi och diabetologi", "Geriatrik",
  "Gynekologisk onkologi", "Handkirurgi", "Hematologi", "Hud- och könssjukdomar",
  "Hörsel- och balansrubbningar", "Infektionssjukdomar", "Internmedicin",
  "Kardiologi", "Kirurgi", "Klinisk farmakologi", "Klinisk fysiologi",
  "Klinisk genetik", "Klinisk immunologi och transfusionsmedicin",
  "Klinisk kemi", "Klinisk mikrobiologi", "Klinisk neurofysiologi",
  "Klinisk patologi", "Kärlkirurgi", "Lungsjukdomar",
  "Medicinsk gastroenterologi och hepatologi", "Neonatologi", "Neurokirurgi",
  "Neurologi", "Neuroradiologi", "Njurmedicin", "Nuklearmedicin",
  "Obstetrik och gynekologi", "Onkologi", "Ortopedi", "Palliativ medicin",
  "Plastikkirurgi", "Psykiatri", "Radiologi", "Rehabiliteringsmedicin",
  "Reumatologi", "Rättsmedicin", "Rättspsykiatri", "Röst- och talrubbningar",
  "Skolhälsovård", "Smärtlindring", "Socialmedicin", "Thoraxkirurgi",
  "Urologi", "Vårdhygien", "Äldrepsykiatri", "Ögonsjukdomar",
  "Öron-, näs- och halssjukdomar",
];

// Nurses — generic + top specializations
const NURSE_GENERIC: Array<[string, string]> = [
  ["Legitimerad sjuksköterska", "Sjuksköterska"],
  ["Barnmorska", "Barnmorska"],
  ["Röntgensjuksköterska", "Röntgensjuksköterska"],
];

const NURSE_SPECIALIZATION_MAP: Record<string, string> = {
  "IVA-sjuksköterska": "Specialistsjuksköterska intensivvård",
  "Psykiatrisjuksköterska": "Specialistsjuksköterska psykiatrisk vård",
  "Ambulanssjuksköterska": "Specialistsjuksköterska ambulanssjukvård",
  "Barnsjuksköterska": "Specialistsjuksköterska barn och ungdom",
  "Operationssjuksköterska": "Specialistsjuksköterska operationssjukvård",
  "Anestesisjuksköterska": "Specialistsjuksköterska anestesi",
  "Akutsjuksköterska": "Specialistsjuksköterska akutsjukvård",
  "Hjärtsjuksköterska": "Specialistsjuksköterska hjärtsjukvård",
  "Distriktssjuksköterska": "Distriktssjuksköterska",
  "Kirurgsjuksköterska": "Specialistsjuksköterska kirurgisk vård",
  "Palliativsjuksköterska": "Specialistsjuksköterska palliativ vård",
  "Geriatriksjuksköterska": "Specialistsjuksköterska vård av äldre",
  "Medicinsjuksköterska": "Specialistsjuksköterska medicinsk vård",
  "Onkologisjuksköterska": "Specialistsjuksköterska onkologisk vård",
  "Infektionssjuksköterska": "Specialistsjuksköterska infektionssjukvård",
};

export const SPECIALITY_OPTIONS: SpecialityOption[] = [
  ...DOCTOR_GENERIC.map(([label, resolvedRole]) => ({
    slug: slugify(label),
    label,
    displayLabel: label,
    category: "lakare" as const,
    resolvedRole,
  })),
  ...DOCTOR_SPECIALTIES.map((rawSpecialty) => {
    const fullLabel = `Specialistläkare ${rawSpecialty.toLowerCase()}`;
    return {
      slug: slugify(rawSpecialty),
      label: fullLabel,
      displayLabel: shortenDoctorLabel(fullLabel, rawSpecialty),
      category: "lakare" as const,
      resolvedRole: fullLabel,
    };
  }),
  ...NURSE_GENERIC.map(([label, resolvedRole]) => ({
    slug: slugify(label),
    label,
    displayLabel: label,
    category: "ssk" as const,
    resolvedRole,
  })),
  ...Object.entries(NURSE_SPECIALIZATION_MAP).map(([label, resolvedRole]) => ({
    slug: slugify(label),
    label,
    displayLabel: label,
    category: "ssk" as const,
    resolvedRole,
  })),
];


export const SPECIALITY_BY_SLUG: Record<string, SpecialityOption> = Object.fromEntries(
  SPECIALITY_OPTIONS.map((o) => [o.slug, o])
);
