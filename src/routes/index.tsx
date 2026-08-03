import { createFileRoute } from "@tanstack/react-router";
import Startsida5c from "@/pages/demo/Startsida5c";
import { ratesQueryOptions } from "@/components/startsida5c/useRates5c";

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
      { name: "twitter:image", content: `${SITE_URL}/compcare-og.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: LANDING_JSONLD.map((ld) => ({
      type: "application/ld+json",
      children: JSON.stringify(ld),
    })),
  }),
  errorComponent: HomeError,
  component: Startsida5c,
});

function HomeError() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-5"
      style={{ background: "#0e1016", color: "#eef0f4" }}
    >
      <div className="max-w-md text-center">
        <h1 className="text-[24px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
          Prisdatan kunde inte hämtas
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "#a3a7b7", lineHeight: 1.6 }}>
          Ramavtalspriserna är tillfälligt otillgängliga. Försök igen om en liten stund.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full px-6 py-3 text-sm font-semibold"
          style={{ border: "1px solid rgba(255,255,255,.18)", color: "#eef0f4" }}
        >
          Försök igen
        </button>
      </div>
    </main>
  );
}
