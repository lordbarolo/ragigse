import { createFileRoute } from "@tanstack/react-router";
import Login from "@/pages/Login";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/logga-in")({
  head: () => seoHead({
    title: 'Logga in – vårdbemanning.ai',
    description: 'Logga in på ditt vårdbemanning.ai-konto för att se din rapport och hantera dina inställningar.',
    path: '/logga-in',
    noindex: true,
  }),
  component: Login,
});
