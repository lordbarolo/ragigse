import { createFileRoute } from "@tanstack/react-router";
import Startsida5c from "@/pages/demo/Startsida5c";
import { ratesQueryOptions } from "@/components/startsida5c/useRates5c";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(ratesQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "CompCare – Lön & ramavtalspriser för vårdkonsulter" },
      {
        name: "description",
        content:
          "Se vad regionen betalar för din roll och zon enligt SKR:s ramavtal 2026 — och vad du kan fakturera efter bemanningsbolagets marginal.",
      },
      { property: "og:title", content: "CompCare – Lön & ramavtalspriser för vårdkonsulter" },
      {
        property: "og:description",
        content: "Ramavtalspriser per roll och zon, och din del av kundpriset som företagare eller löntagare.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vardbemanning.ai/" },
      { name: "twitter:card", content: "summary_large_image" },

    ],
  }),
  component: Startsida5c,
});
