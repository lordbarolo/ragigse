import { createFileRoute } from "@tanstack/react-router";
import Unsubscribe from "@/pages/Unsubscribe";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/unsubscribe")({
  head: () => seoHead({
    title: 'Avregistrera utskick – vårdbemanning.ai',
    description: 'Avregistrera dig från vårdbemanning.ai:s e-postutskick.',
    path: '/unsubscribe',
    noindex: true,
  }),
  component: Unsubscribe,
});
