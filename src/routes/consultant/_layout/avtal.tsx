import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Avtalsassistent from "@/pages/Avtalsassistent";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/consultant/_layout/avtal")({
  head: () =>
    seoHead({
      title: "Avtalsassistent – vårdbemanning.ai",
      description:
        "Få svar om ramavtalet för hyrpersonal: priser, krav, OB, vite, uppsägning och anställningsform.",
      path: "/consultant/avtal",
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Avtalsassistent />
    </ProtectedRoute>
  ),
});
