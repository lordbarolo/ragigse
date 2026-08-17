import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import CvArbetsyta from "@/pages/CvArbetsyta";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/consultant/_layout/cv")({
  head: () =>
    seoHead({
      title: "CV-assistenten – vårdbemanning.ai",
      description: "Bygg och exportera ditt CV med assistenten i din egen arbetsyta.",
      path: "/consultant/cv",
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <CvArbetsyta />
    </ProtectedRoute>
  ),
});
