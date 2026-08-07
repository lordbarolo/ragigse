import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Negotiate from "@/pages/Negotiate";
import { seoHead } from "@/lib/seo/routeHead";

export const Route = createFileRoute("/consultant/forhandla")({
  head: () =>
    seoHead({
      title: "Löneassistenten – vårdbemanning.ai",
      description: "AI-driven förhandlingsassistent med marknadsdata för vårdkonsulter.",
      path: "/consultant/forhandla",
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Negotiate />
    </ProtectedRoute>
  ),
});
