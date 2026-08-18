/**
 * Färskhetsregister — en post per publik innehållsyta (rollrapport eller guide).
 *
 * Ersätter hårdkodade `LAST_UPDATED`-konstanter i sidorna. Samma värde driver:
 *  - synligt "Senast uppdaterad" på sidan
 *  - `dateModified` / `datePublished` i JSON-LD (buildRoleReportSchemas)
 *  - `<lastmod>` i public/sitemap.xml (scripts/generate-sitemap.ts)
 *
 * REGLER
 *  - `updatedAt` sätts ALDRIG från byggtid, dagens datum eller genereringstid.
 *    Det är ett faktiskt innehållsdatum — dagen då sidans innehåll ändrades.
 *  - Uppdatera posten (datum + reason) i samma ändring som innehållet ändras.
 *  - Saknas nyckel faller sidan tillbaka på DEFAULT_FRESHNESS, som speglar
 *    ramavtalets ikraftträdande.
 *
 * Modulen är avsiktligt fri från React/DOM-beroenden så att den kan importeras
 * både i SSR-sidor och i Node-scriptet som genererar sitemapen.
 */

export interface ContentFreshness {
  /** ISO-datum (YYYY-MM-DD) — dagen innehållet faktiskt ändrades. */
  updatedAt: string;
  /** Varför datumet ändrades. Spårbarhet, visas inte publikt. */
  reason: string;
  /** Avtalsversion sidans priser bygger på, t.ex. "v1.6" (läkare) / "v1.7" (ssk). */
  contractVersion: string;
}

/** Fallback när en nyckel saknas i registret. */
export const DEFAULT_FRESHNESS: ContentFreshness = {
  updatedAt: "2026-01-15",
  reason: "SKR-ramavtal vårdbemanning 2026 trädde i kraft 2026-01-01",
  contractVersion: "2026",
};

/**
 * Nycklar:
 *  - rollrapport: `rapport/<slug>` (samma slug som /rapport/<slug>)
 *  - guide:       `guide/<slug>`
 */
export const CONTENT_FRESHNESS: Record<string, ContentFreshness> = {
  // Sjuksköterskor — SKR v1.7 (2026-01-01)
  "rapport/sjukskoterska": {
    updatedAt: "2026-06-20",
    reason: "Priser uppdaterade till SKR v1.7 samt 1:1-bindning roll→pris",
    contractVersion: "v1.7",
  },
  "rapport/anestesisjukskoterska": {
    updatedAt: "2026-06-20",
    reason: "Priser uppdaterade till SKR v1.7 (grupp hög: 770/824/880)",
    contractVersion: "v1.7",
  },

  // Läkare — SKR v1.6 (2026-01-01)
  "rapport/lakare-allmanmedicin": {
    updatedAt: "2026-06-20",
    reason: "Priser uppdaterade till SKR v1.6",
    contractVersion: "v1.6",
  },
  "rapport/bollnas-lakare-alm": {
    updatedAt: "2026-01-15",
    reason: "Ortsspecifik sida publicerad mot SKR v1.6",
    contractVersion: "v1.6",
  },

  // Guider
  "guide/hyrlakare-lon-2026": {
    updatedAt: "2026-08-18",
    reason: "Guide publicerad med 14 specialiteter mot SKR v1.6",
    contractVersion: "v1.6",
  },
};

/**
 * Alla läkarspecialitetssidor delar samma innehållsdatum eftersom de renderas
 * från samma mall och samma prisunderlag (doctorSpecialtyReports + SKR v1.6).
 */
export const DOCTOR_SPECIALTY_FRESHNESS: ContentFreshness = {
  updatedAt: "2026-06-20",
  reason: "Specialitetssidor byggda mot SKR v1.6, zon 3-priser korrigerade",
  contractVersion: "v1.6",
};

/** Slår upp färskhet för en nyckel. Okänd nyckel → specialitets- eller standardvärde. */
export function getContentFreshness(key: string): ContentFreshness {
  const hit = CONTENT_FRESHNESS[key];
  if (hit) return hit;
  if (key.startsWith("rapport/lakare-")) return DOCTOR_SPECIALTY_FRESHNESS;
  return DEFAULT_FRESHNESS;
}

/** Genväg: ISO-datum för en rollrapport-slug. */
export function getReportUpdatedAt(slug: string): string {
  return getContentFreshness(`rapport/${slug}`).updatedAt;
}

/** Genväg: ISO-datum för en guide-slug. */
export function getGuideUpdatedAt(slug: string): string {
  return getContentFreshness(`guide/${slug}`).updatedAt;
}
