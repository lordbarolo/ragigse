/**
 * Sitewide JSON-LD schemas for CompCare.
 *
 * Used to establish maskinläsbar canonicitet för agenter och AI-verktyg
 * (ChatGPT, Gemini, Claude, Perplexity m.fl.). Statiskt innehåll —
 * inga props, inga runtime-beroenden. Inkluderas en gång per sida
 * via <SEO jsonLd={[organizationSchema, websiteSchema, ...]} />.
 *
 * Källor:
 * - schema.org/Organization
 * - schema.org/WebSite (med potentialAction för SearchAction)
 */

import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "CompCare",
  alternateName: "CompCare.se",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/compcare-logo.svg`,
    width: 512,
    height: 512,
  },
  image: `${BASE_URL}/compcare-og.png`,
  description:
    "CompCare är en svensk ersättnings- och verifieringsplattform för vårdkonsulter. Jämför löner och timpriser mot SKR:s ramavtal i 290 kommuner.",
  foundingDate: "2024",
  areaServed: {
    "@type": "Country",
    name: "Sverige",
  },
  knowsAbout: [
    "Ersättning för vårdkonsulter",
    "SKR ramavtal vårdbemanning",
    "Timpriser sjuksköterskor",
    "Timpriser läkare",
    "Bemanningsmarginal vård",
    "Fakturagranskning vårdbemanning",
    "Vårdbemanning Sverige",
  ],
  sameAs: [
    "https://www.linkedin.com/company/compcare-se",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "hej@compcare.se",
    areaServed: "SE",
    availableLanguage: ["Swedish", "English"],
  },
} as const;

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  url: BASE_URL,
  name: "CompCare",
  description:
    "Lön & ramavtalspriser för vårdkonsulter — jämför din ersättning mot SKR:s officiella ramavtal.",
  inLanguage: "sv-SE",
  publisher: { "@id": `${BASE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/rapport/{search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
} as const;

/** Convenience: spread both into a single SEO jsonLd array. */
export const sitewideSchemas = [organizationSchema, websiteSchema];
