import { createFileRoute } from "@tanstack/react-router";
import AllmanmedicinReport from "@/pages/AllmanmedicinReport";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/rapport/lakare-allmanmedicin")({
  head: () => seoHead({
    title: 'Specialistläkare allmänmedicin – timpris & ersättning 2026',
    description: 'Ramavtalspriser per zon och möjlig konsultersättning för specialistläkare i allmänmedicin. Källa: SKR:s ramavtal vårdbemanning 2026.',
    path: '/rapport/lakare-allmanmedicin',
    ogType: "article",
  }),
  component: AllmanmedicinReport,
});
