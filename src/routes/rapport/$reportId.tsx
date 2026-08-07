import { createFileRoute } from "@tanstack/react-router";
import Report from "@/pages/Report";
import LakareSpecialtyReport from "@/pages/LakareSpecialtyReport";
import { DOCTOR_SPECIALTY_REPORTS } from "@/data/doctorSpecialtyReports";
import { seoHead } from "@/lib/seo/routeHead";

const DOCTOR_SLUGS = new Set(DOCTOR_SPECIALTY_REPORTS.map((r) => r.slug));

// In the old App.tsx, DOCTOR_SPECIALTY_REPORTS.map() generated one static
// route per doctor specialty ahead of the dynamic /rapport/:reportId route.
// Here a single dynamic route dispatches on the same data source.
function RapportDispatch() {
  const { reportId } = Route.useParams();
  if (DOCTOR_SLUGS.has(reportId)) return <LakareSpecialtyReport />;
  return <Report />;
}

export const Route = createFileRoute("/rapport/$reportId")({
  head: ({ params }) => {
    const cfg = DOCTOR_SPECIALTY_REPORTS.find((r) => r.slug === params.reportId);
    if (cfg) {
      return seoHead({
        title: cfg.metaTitle,
        description: cfg.metaDescription,
        path: `/rapport/${cfg.slug}`,
        ogType: "article",
      });
    }
    // Personliga rapporter (/rapport/<uuid>) kräver access och kan inte läsas
    // av crawlers — de ska inte indexeras.
    return seoHead({
      title: "Din rapport – vårdbemanning.ai",
      description: "Din personliga ersättningsrapport enligt regionernas ramavtal 2026.",
      path: `/rapport/${params.reportId}`,
      ogType: "article",
      noindex: true,
    });
  },
  component: RapportDispatch,
});
