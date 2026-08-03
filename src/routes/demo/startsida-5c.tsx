import { createFileRoute } from "@tanstack/react-router";
import Startsida5c from "@/pages/demo/Startsida5c";
import { ratesQueryOptions } from "@/components/startsida5c/useRates5c";
import { RateDataError, RateNotFound } from "@/components/startsida5c/Fallbacks5c";

export const Route = createFileRoute("/demo/startsida-5c")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(ratesQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Startsida 5c (demo) – CompCare" },
      { name: "description", content: "Intern designdemo av startsidan. Inte indexerad." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: RateDataError,
  notFoundComponent: RateNotFound,
  component: Startsida5c,
});
