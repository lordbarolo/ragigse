import { createFileRoute } from "@tanstack/react-router";
import Startsida from "@/pages/Startsida";
import { ratesQueryOptions } from "@/components/startsida5c/useRates5c";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(ratesQueryOptions);
    } catch (err) {
      // Startsidan renderas utan prisdata i stället för att fälla hela sidan.
      console.error("[/] prisdata kunde inte förhandshämtas", err);
    }
  },
  head: () =>
    seoHead({
      title: "vårdbemanning.ai – AI för vårdens konsulter",
      description:
        "Hitta timmar du missat att fakturera, få notis vid årets prisjustering och stöd i löneförhandlingen. Baserat på offentliga ramavtal.",
      path: "/",
    }),
  component: Startsida,
});
