import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import SalaryAnalysis from "@/pages/SalaryAnalysis";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/consultant/_layout/loneanalys")({
  head: () =>
    seoHead({
      title: "Löneanalys – vårdbemanning.ai",
      description: "Din kompletta ersättningsrapport utifrån regionernas ramavtal.",
      path: "/consultant/loneanalys",
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <SalaryAnalysis />
    </ProtectedRoute>
  ),
});
