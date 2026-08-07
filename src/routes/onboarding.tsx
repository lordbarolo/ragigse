import { createFileRoute } from "@tanstack/react-router";
import Onboarding from "@/pages/Onboarding";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/onboarding")({
  head: () => seoHead({
    title: 'Kom igång – vårdbemanning.ai',
    description: 'Fyll i roll, ort, kontraktsform och ersättning för att se dina villkor i förhållande till marknaden.',
    path: '/onboarding',
    noindex: true,
  }),
  component: Onboarding,
});
