/**
 * Parametriska JSON-LD-schemas för /rapport/:role och liknande
 * rollspecifika sidor. Bygger Article + Dataset + FAQPage som
 * pekar tillbaka mot Organization-noden i organizationSchema.ts
 * via @id-referenser.
 *
 * Designprinciper:
 * - Allt material är härlett från SKR:s ramavtal (isBasedOn).
 * - dateModified används av agenter för att bedöma färskhet —
 *   skicka alltid in en ISO-string (samma värde som visas i TL;DR).
 * - Inga PII, inga peer-jämförelser, ingen SCB.
 */

import { organizationSchema } from "./organizationSchema";

const BASE_URL = "https://vardbemanning.ai";
const ORG_REF = { "@id": `${BASE_URL}/#organization` };


export interface RoleReportSchemaInput {
  /** Visningsnamn för rollen, t.ex. "Anestesisjuksköterska". */
  roleName: string;
  /** URL-slug, t.ex. "anestesisjukskoterska". */
  roleSlug: string;
  /** ISO-datum, t.ex. "2026-01-15". Drivs av samma fält som TL;DR. */
  dateModified: string;
  /** Valfri region/kommun-kontext, t.ex. "Stockholm" eller "Glesbygd". */
  region?: string;
  /** Pris- eller lönespann i SEK/h som rapporten visar. */
  rateRange?: {
    min: number;
    median: number;
    max: number;
    unit?: "SEK/h" | "SEK/månad";
  };
  /** SKR-källor som ligger till grund för datan. */
  skrSources?: string[];
  /** FAQ-poster — håll dem agentvänliga, formulerade som naturliga frågor. */
  faq?: Array<{ question: string; answer: string }>;
  /** Kort sammanfattning, motsvarar TL;DR-boxens innehåll. */
  summary?: string;
}

function buildPath(roleSlug: string, region?: string): string {
  return region
    ? `/rapport/${roleSlug}?region=${encodeURIComponent(region.toLowerCase())}`
    : `/rapport/${roleSlug}`;
}

/** Article-schema — gör sidan citerbar som källa i AI-svar. */
export function buildArticleSchema(input: RoleReportSchemaInput) {
  const path = buildPath(input.roleSlug, input.region);
  const url = `${BASE_URL}${path}`;
  const headline = input.region
    ? `Ersättning för ${input.roleName} i ${input.region}`
    : `Ersättning för ${input.roleName} — ramavtalspriser och lönespann`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline,
    description:
      input.summary ??
      `Aktuella ramavtalspriser och möjlig ersättning för ${input.roleName} baserat på SKR:s ramavtal 2026.`,
    inLanguage: "sv-SE",
    url,
    mainEntityOfPage: url,
    datePublished: input.dateModified,
    dateModified: input.dateModified,
    author: ORG_REF,
    publisher: ORG_REF,
    creator: ORG_REF,
    isBasedOn: input.skrSources ?? ["https://skr.se/ramavtal/vardbemanning"],
    about: {
      "@type": "Thing",
      name: input.roleName,
    },
    keywords: [
      input.roleName,
      "ramavtalspriser",
      "vårdbemanning",
      "SKR",
      input.region,
    ].filter(Boolean),
  } as const;
}

/** Dataset-schema — markerar pris-/lönedatan som strukturerad dataset. */
export function buildDatasetSchema(input: RoleReportSchemaInput) {
  const path = buildPath(input.roleSlug, input.region);
  const url = `${BASE_URL}${path}`;
  const unit = input.rateRange?.unit ?? "SEK/h";

  const variableMeasured = input.rateRange
    ? [
        { "@type": "PropertyValue", name: "min", value: input.rateRange.min, unitText: unit },
        { "@type": "PropertyValue", name: "median", value: input.rateRange.median, unitText: unit },
        { "@type": "PropertyValue", name: "max", value: input.rateRange.max, unitText: unit },
      ]
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: `Ramavtalspriser för ${input.roleName}${input.region ? ` — ${input.region}` : ""}`,
    description: `Strukturerad data över ersättningsnivåer för ${input.roleName} baserat på SKR:s ramavtal 2026 och bemanningsbranschens marginalmodeller.`,
    url,
    inLanguage: "sv-SE",
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: ORG_REF,
    publisher: ORG_REF,
    isBasedOn: input.skrSources ?? ["https://skr.se/ramavtal/vardbemanning"],
    datePublished: input.dateModified,
    dateModified: input.dateModified,
    spatialCoverage: {
      "@type": "Place",
      name: input.region ?? "Sverige",
    },
    variableMeasured,
    keywords: [input.roleName, "ramavtal", "ersättning", "vårdbemanning"],
  } as const;
}

/** FAQPage-schema — direkta agent-formulerade frågor & svar. */
export function buildFaqSchema(input: RoleReportSchemaInput) {
  if (!input.faq || input.faq.length === 0) return null;
  const path = buildPath(input.roleSlug, input.region);
  const url = `${BASE_URL}${path}`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    inLanguage: "sv-SE",
    mainEntity: input.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  } as const;
}

/**
 * Bygger samtliga schemas för en rollrapport i ett anrop.
 * Filtrerar bort null-värden så resultatet kan skickas direkt till
 * <SEO jsonLd={...} />.
 */
export function buildRoleReportSchemas(input: RoleReportSchemaInput) {
  return [
    // Include the Organization node so author/publisher/creator @id refs resolve
    // on every report page (not only on the homepage). Prevents broken-internal-
    // reference findings in structured-data validators.
    organizationSchema,
    buildArticleSchema(input),
    buildDatasetSchema(input),
    buildFaqSchema(input),
  ].filter(Boolean) as Record<string, unknown>[];
}

