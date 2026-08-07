import { createFileRoute } from "@tanstack/react-router";
import SjukskoterskaReport from "@/pages/SjukskoterskaReport";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/rapport/sjukskoterska")({
  head: () => seoHead({
    title: 'Sjuksköterska – timpris & ersättning 2026 | leg ssk',
    description: 'Ramavtalspriser per zon och möjlig konsultersättning för legitimerad sjuksköterska (grundutbildning). Källa: SKR:s ramavtal vårdbemanning 2026.',
    path: '/rapport/sjukskoterska',
    ogType: "article",
  }),
  component: SjukskoterskaReport,
});
