import { createFileRoute } from "@tanstack/react-router";
import Startsida5c from "@/pages/demo/Startsida5c";
import { ratesQueryOptions } from "@/components/startsida5c/useRates5c";
import { RateDataError, RateNotFound } from "@/components/startsida5c/Fallbacks5c";

const SITE_URL = "https://vardbemanning.ai";

const LANDING_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CompCare",
    url: `${SITE_URL}/`,
    inLanguage: "sv-SE",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CompCare",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/compcare-logo.svg`,
  },
];

const TITLE = "CompCare – Lön & ramavtalspriser för vårdkonsulter";
const DESCRIPTION =
  "Se vad regionen betalar för din roll och zon enligt SKR:s ramavtal 2026 — och vad du kan fakturera efter bemanningsbolagets marginal.";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(ratesQueryOptions);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/compcare-og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}/compcare-og.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: LANDING_JSONLD.map((ld) => ({
      type: "application/ld+json",
      children: JSON.stringify(ld),
    })),
  }),
  errorComponent: RateDataError,
  notFoundComponent: RateNotFound,
  component: Startsida5c,
});
