import { createFileRoute } from "@tanstack/react-router";
import BollnasAllmanspecialistReport from "@/pages/BollnasAllmanspecialistReport";
import { seoHead } from "@/lib/seo/routeHead";

// Covers both /bollnas/lakare-alm and /Bollnas/lakare-alm — TanStack Router
// matches paths case-insensitively by default.
export const Route = createFileRoute("/bollnas/lakare-alm")({
  head: () =>
    seoHead({
      title: "Allmänspecialist Bollnäs – timpris & konsultarvode 2026",
      description:
        "Ramavtalspriser, möjlig konsultersättning och förhandlingsspann för specialistläkare i allmänmedicin i Bollnäs (Zon 3). Källa: SKR ramavtal 2026.",
      path: "/bollnas/lakare-alm",
      ogType: "article",
      noindex: true,
    }),
  component: BollnasAllmanspecialistReport,
});
