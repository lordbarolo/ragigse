/**
 * SKR Ramavtal vårdbemanning 2026 (v1.6) — Specialistläkare-priser per zon.
 * Källa: contract_version_rates (publika SKR-priser, verifierat 2026-06).
 * Använd ALDRIG andra siffror än de som finns i DB.
 */

export interface DoctorSpecialtyConfig {
  slug: string;
  /** Kort label för h1/UI */
  title: string;
  /** Lång officiell SKR-kategori */
  skrCategory: string;
  /** Slug för prefill mot start-formuläret (?yrke=…) */
  prefillSlug: string;
  metaTitle: string;
  metaDescription: string;
  zone1: number;
  zone2: number;
  zone3: number;
}

export const DOCTOR_SPECIALTY_REPORTS: DoctorSpecialtyConfig[] = [
  {
    slug: "lakare-anestesi",
    title: "Anestesiläkare",
    skrCategory: "Specialistläkare anestesi och intensivvård",
    prefillSlug: "anestesi-och-intensivvard",
    metaTitle: "Anestesiläkare – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i anestesi och intensivvård 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-barn-och-ungdomsmedicin",
    title: "Barn- och ungdomsmedicin",
    skrCategory: "Specialistläkare barn- och ungdomsmedicin",
    prefillSlug: "barn-och-ungdomsmedicin",
    metaTitle: "Barnläkare – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i barn- och ungdomsmedicin 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-bup",
    title: "Barn- och ungdomspsykiatri (BUP)",
    skrCategory: "Specialistläkare barn- och ungdomspsykiatri",
    prefillSlug: "barn-och-ungdomspsykiatri",
    metaTitle: "BUP-läkare – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i barn- och ungdomspsykiatri (BUP) 2026.",
    zone1: 1457, zone2: 1678, zone3: 1678,
  },
  {
    slug: "lakare-dermatolog",
    title: "Dermatolog",
    skrCategory: "Specialistläkare hud- och könssjukdomar",
    prefillSlug: "hud-och-konssjukdomar",
    metaTitle: "Dermatolog – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i hud- och könssjukdomar (dermatologi) 2026.",
    zone1: 1457, zone2: 1678, zone3: 1953,
  },
  {
    slug: "lakare-kardiolog",
    title: "Kardiolog",
    skrCategory: "Specialistläkare kardiologi",
    prefillSlug: "kardiologi",
    metaTitle: "Kardiolog – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i kardiologi 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-internmedicin",
    title: "Internmedicin",
    skrCategory: "Specialistläkare internmedicin",
    prefillSlug: "internmedicin",
    metaTitle: "Internmedicinare – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i internmedicin 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-hematologi",
    title: "Hematologi",
    skrCategory: "Specialistläkare hematologi",
    prefillSlug: "hematologi",
    metaTitle: "Hematolog – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i hematologi 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-njurmedicin",
    title: "Njurmedicin",
    skrCategory: "Specialistläkare njurmedicin",
    prefillSlug: "njurmedicin",
    metaTitle: "Njurmedicinare – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i njurmedicin 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-neurologi",
    title: "Neurolog",
    skrCategory: "Specialistläkare neurologi",
    prefillSlug: "neurologi",
    metaTitle: "Neurolog – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i neurologi 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-onh",
    title: "ÖNH (öron-, näs- och halsläkare)",
    skrCategory: "Specialistläkare öron-, näs- och halssjukdomar",
    prefillSlug: "oron-nas-och-halssjukdomar",
    metaTitle: "ÖNH-läkare – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i öron-, näs- och halssjukdomar 2026.",
    zone1: 1238, zone2: 1513, zone3: 1787,
  },
  {
    slug: "lakare-psykiatri",
    title: "Psykiater",
    skrCategory: "Specialistläkare psykiatri",
    prefillSlug: "psykiatri",
    metaTitle: "Psykiater – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i psykiatri 2026.",
    zone1: 1457, zone2: 1678, zone3: 1953,
  },
  {
    slug: "lakare-radiologi",
    title: "Radiolog",
    skrCategory: "Specialistläkare radiologi",
    prefillSlug: "radiologi",
    metaTitle: "Radiolog – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i radiologi 2026.",
    zone1: 1457, zone2: 1678, zone3: 1953,
  },
  {
    slug: "lakare-ogon",
    title: "Ögonläkare",
    skrCategory: "Specialistläkare ögonsjukdomar",
    prefillSlug: "ogonsjukdomar",
    metaTitle: "Ögonläkare – timpris & ersättning 2026",
    metaDescription:
      "SKR-ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i ögonsjukdomar 2026.",
    zone1: 1457, zone2: 1678, zone3: 1953,
  },
];

export const DOCTOR_SPECIALTY_BY_SLUG: Record<string, DoctorSpecialtyConfig> =
  Object.fromEntries(DOCTOR_SPECIALTY_REPORTS.map((r) => [r.slug, r]));
