import { createFileRoute } from "@tanstack/react-router";
import Startsida from "@/pages/Startsida";
import { ratesQueryOptions } from "@/components/startsida5c/useRates5c";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(ratesQueryOptions);
    } catch (err) {
      // Startsidan renderas utan prisdata i stället för att fälla hela sidan.
      console.error("[/] prisdata kunde inte förhandshämtas", err);
    }
  },
  head: () => ({
    meta: [
      { title: "Fakturerar du rätt? AI-koll för vårdkonsulter | vårdbemanning.ai" },
      {
        name: "description",
        content:
          "Hitta timmar du missat att fakturera, få notis vid årets prisjustering och stöd i löneförhandlingen. Baserat på offentliga ramavtal.",
      },
      { property: "og:title", content: "Fakturerar du rätt? AI-koll för vårdkonsulter | vårdbemanning.ai" },
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
  component: Startsida,
});
