import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Profile from "@/pages/Profile";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/consultant/_layout/profil")({
  head: () =>
    seoHead({
      title: "Min profil – vårdbemanning.ai",
      description: "Hantera dina rapporter, dokument och kontoinställningar på vårdbemanning.ai.",
      path: "/consultant/profil",
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  ),
});
