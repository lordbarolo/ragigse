/**
 * Guidesidor — långformat innehåll som bygger på SKR:s ramavtal.
 *
 * Enda källan för slug/title/description. Används av route-head (seoHead),
 * scripts/generate-sitemap.ts och footerlänkarna så att inget glider isär.
 */

export interface GuideConfig {
  slug: string;
  /** Kort label för navigation/footer */
  label: string;
  metaTitle: string;
  metaDescription: string;
  /** ISO-datum, används i Article-schemats dateModified */
  lastUpdated: string;
}

export const GUIDES: GuideConfig[] = [
  {
    slug: "hyrlakare-lon-2026",
    label: "Hyrläkare lön 2026",
    metaTitle: "Hyrläkare lön 2026 – timpris per specialitet och zon",
    metaDescription:
      "Vad tjänar en hyrläkare 2026? Ramavtalspris per zon och möjlig timersättning för 14 specialiteter. Källa: SKR:s ramavtal vårdbemanning 2026.",
    lastUpdated: "2026-08-18",
  },
];

export const GUIDE_BY_SLUG: Record<string, GuideConfig> = Object.fromEntries(
  GUIDES.map((g) => [g.slug, g]),
);
