import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Fakturahjalp from "@/pages/Fakturahjalp";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/consultant/_layout/fakturahjalp")({
  head: () =>
    seoHead({
      title: "Fakturahjälpen – vårdbemanning.ai",
      description:
        "Ladda upp tidrapporter och fakturor för granskning mot ramavtalets ersättningsnivåer.",
      path: "/consultant/fakturahjalp",
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Fakturahjalp />
    </ProtectedRoute>
  ),
});
