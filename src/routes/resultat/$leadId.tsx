import { createFileRoute } from "@tanstack/react-router";
import AnalysisScreen from "@/pages/AnalysisScreen";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/resultat/$leadId")({
  head: ({ params }) =>
    seoHead({
      title: "Din analys – vårdbemanning.ai",
      description: "Din personliga ersättningsanalys enligt regionernas ramavtal 2026.",
      path: `/resultat/${params.leadId}`,
      noindex: true,
    }),
  component: AnalysisScreen,
});
