import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/integritetspolicy")({
  head: () => seoHead({
    title: 'Integritetspolicy – vårdbemanning.ai',
    description: 'Så hanterar vårdbemanning.ai dina personuppgifter: lagring i EU, anonym analys, dina rättigheter och kontaktinformation.',
    path: '/integritetspolicy',
  }),
  component: PrivacyPolicy,
});
