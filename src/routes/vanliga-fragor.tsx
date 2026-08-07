import { createFileRoute } from "@tanstack/react-router";
import FAQ from "@/pages/FAQ";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/vanliga-fragor")({
  head: () => seoHead({
    title: 'Vanliga frågor om ersättning för vårdkonsulter | vårdbemanning.ai',
    description: 'Svar på vanliga frågor om ersättning, SKR-ramavtalspriser och hur vårdbemanning.ai hjälper dig jämföra din ersättning mot möjlig ersättning.',
    path: '/vanliga-fragor',
  }),
  component: FAQ,
});
