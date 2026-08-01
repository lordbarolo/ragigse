import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Negotiate from "@/pages/Negotiate";

export const Route = createFileRoute("/consultant/forhandla")({
  component: () => (
    <ProtectedRoute>
      <Negotiate />
    </ProtectedRoute>
  ),
});
