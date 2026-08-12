import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import PensionSimulator from "@/pages/PensionSimulator";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/consultant/_layout/pension")({
  head: () =>
    seoHead({
      title: "Pensionssimulator – vårdbemanning.ai",
      description:
        "Se hur ersättningsnivån påverkar din kollektivavtalade tjänstepension per månad och år.",
      path: "/consultant/pension",
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <PensionSimulator />
    </ProtectedRoute>
  ),
});
