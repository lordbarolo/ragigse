import { createFileRoute } from "@tanstack/react-router";
import Signup from "@/pages/Signup";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/registrera")({
  head: () => seoHead({
    title: 'Skapa konto – vårdbemanning.ai',
    description: 'Skapa ett gratis vårdbemanning.ai-konto för att spara dina rapporter och få notiser om nya analyser.',
    path: '/registrera',
    noindex: true,
  }),
  component: Signup,
});
