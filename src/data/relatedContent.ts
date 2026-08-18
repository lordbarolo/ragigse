/**
 * Relationskarta för internlänkning mellan rollsidor.
 *
 * Enda källan för "relaterade roller"-modulen (src/components/report/RelateradeSidor.tsx).
 * Läkarspecialiteterna läses ur DOCTOR_SPECIALTY_REPORTS så att inget dubbellagras —
 * lägg till en specialitet där och den blir automatiskt länkbar här.
 *
 * Endast kanoniska, indexerbara sidor får finnas i listan. Aldrig /lon/*, /kampanj/*
 * eller alias-slugar (de är noindex och 301:ar).
 */

import { DOCTOR_SPECIALTY_REPORTS } from "./doctorSpecialtyReports";

export type RoleGroup =
  | "akut_operation"
  | "barn"
  | "medicin"
  | "psykiatri"
  | "diagnostik_sinnen"
  | "primarvard"
  | "omvardnad";

export type RoleKind = "lakare" | "sjukskoterska";

export interface RelatedPage {
  /** Rapport-slug, t.ex. "lakare-kardiolog". */
  slug: string;
  /** Kanonisk sökväg. */
  path: string;
  /** Beskrivande länktext (aldrig "Läs mer"). */
  linkText: string;
  /** Kort undertext med zonspann. */
  blurb: string;
  group: RoleGroup;
  kind: RoleKind;
}

/** Vilken yrkesgrupp varje läkarspecialitet hör till. */
const DOCTOR_GROUPS: Record<string, RoleGroup> = {
  "lakare-anestesi": "akut_operation",
  "lakare-kardiolog": "akut_operation",
  "lakare-barn-och-ungdomsmedicin": "barn",
  "lakare-bup": "barn",
  "lakare-internmedicin": "medicin",
  "lakare-hematologi": "medicin",
  "lakare-njurmedicin": "medicin",
  "lakare-neurologi": "medicin",
  "lakare-psykiatri": "psykiatri",
  "lakare-dermatolog": "diagnostik_sinnen",
  "lakare-radiologi": "diagnostik_sinnen",
  "lakare-onh": "diagnostik_sinnen",
  "lakare-ogon": "diagnostik_sinnen",
};

/** Närliggande grupper — används för att fylla ut till 3–4 länkar. */
const NEIGHBOURS: Record<RoleGroup, RoleGroup[]> = {
  akut_operation: ["medicin", "diagnostik_sinnen", "omvardnad"],
  barn: ["psykiatri", "medicin", "omvardnad"],
  medicin: ["akut_operation", "diagnostik_sinnen", "primarvard"],
  psykiatri: ["barn", "medicin", "primarvard"],
  diagnostik_sinnen: ["medicin", "akut_operation", "primarvard"],
  primarvard: ["medicin", "psykiatri", "omvardnad"],
  omvardnad: ["akut_operation", "primarvard", "medicin"],
};

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const zoneBlurb = (zone1: number, zone3: number) =>
  `Ramavtalspris ${fmt(zone1)}–${fmt(zone3)} kr/timme beroende på zon.`;

/** Handskrivna rapportsidor utanför läkarspecialitetslistan. */
const MANUAL_PAGES: RelatedPage[] = [
  {
    slug: "lakare-allmanmedicin",
    path: "/rapport/lakare-allmanmedicin",
    linkText: "Allmänläkare (distriktsläkare) – ramavtalspris och ersättning 2026",
    blurb: zoneBlurb(1238, 1787),
    group: "primarvard",
    kind: "lakare",
  },
  {
    slug: "sjukskoterska",
    path: "/rapport/sjukskoterska",
    linkText: "Legitimerad sjuksköterska – ramavtalspris och ersättning 2026",
    blurb: zoneBlurb(616, 715),
    group: "omvardnad",
    kind: "sjukskoterska",
  },
  {
    slug: "anestesisjukskoterska",
    path: "/rapport/anestesisjukskoterska",
    linkText: "Anestesisjuksköterska – ramavtalspris och ersättning 2026",
    blurb: zoneBlurb(770, 880),
    group: "akut_operation",
    kind: "sjukskoterska",
  },
];

export const RELATED_PAGES: RelatedPage[] = [
  ...MANUAL_PAGES,
  ...DOCTOR_SPECIALTY_REPORTS.map<RelatedPage>((r) => ({
    slug: r.slug,
    path: `/rapport/${r.slug}`,
    linkText: `${r.title} – ramavtalspris och ersättning 2026`,
    blurb: zoneBlurb(r.zone1, r.zone3),
    group: DOCTOR_GROUPS[r.slug] ?? "medicin",
    kind: "lakare",
  })),
];

export const RELATED_PAGE_BY_SLUG: Record<string, RelatedPage> = Object.fromEntries(
  RELATED_PAGES.map((p) => [p.slug, p]),
);

/**
 * 3–4 relaterade rollsidor: samma yrkesgrupp först, sedan närliggande grupper,
 * därefter samma yrkeskategori. Aldrig sidan själv.
 */
export function getRelatedPages(currentSlug: string, limit = 4): RelatedPage[] {
  const current = RELATED_PAGE_BY_SLUG[currentSlug];
  const pool = RELATED_PAGES.filter((p) => p.slug !== currentSlug);
  if (!current) return pool.slice(0, limit);

  const buckets: RelatedPage[][] = [
    pool.filter((p) => p.group === current.group),
    ...NEIGHBOURS[current.group].map((g) => pool.filter((p) => p.group === g)),
    pool.filter((p) => p.kind === current.kind),
    pool,
  ];

  const out: RelatedPage[] = [];
  for (const bucket of buckets) {
    for (const page of bucket) {
      if (out.length >= limit) return out;
      if (!out.some((p) => p.slug === page.slug)) out.push(page);
    }
  }
  return out;
}

/** Sökvägar för JSON-LD (relatedLink / ItemList). */
export function getRelatedPaths(currentSlug: string, limit = 4): string[] {
  return getRelatedPages(currentSlug, limit).map((p) => p.path);
}
