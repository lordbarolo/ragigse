import { createFileRoute } from "@tanstack/react-router";
import AnestesiReport from "@/pages/AnestesiReport";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/rapport/anestesisjukskoterska")({
  head: () => seoHead({
    title: 'Anestesisjuksköterska – timpris & lön 2026 | vårdbemanning.ai',
    description: 'Aktuella ramavtalspriser, OB-tillägg och rekommenderat konsultarvode för anestesisjuksköterskor i Sveriges tre priszoner.',
    path: '/rapport/anestesisjukskoterska',
    ogType: "article",
  }),
  component: AnestesiReport,
});
