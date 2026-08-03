import { createFileRoute } from "@tanstack/react-router";
import Startsida5c from "@/pages/demo/Startsida5c";
import { ratesQueryOptions } from "@/components/startsida5c/useRates5c";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(ratesQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Fakturerar du rätt? AI-koll för vårdkonsulter | CompCare" },
      {
        name: "description",
        content:
          "Hitta timmar du missat att fakturera, få notis vid årets prisjustering och stöd i löneförhandlingen. Baserat på offentliga ramavtal.",
      },
      { property: "og:title", content: "Fakturerar du rätt? AI-koll för vårdkonsulter | CompCare" },
      {
        property: "og:description",
        content:
          "Hitta timmar du missat att fakturera, få notis vid årets prisjustering och stöd i löneförhandlingen. Baserat på offentliga ramavtal.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vardbemanning.ai/" },
      { name: "twitter:card", content: "summary_large_image" },


    ],
  }),
  component: Startsida5c,
});
