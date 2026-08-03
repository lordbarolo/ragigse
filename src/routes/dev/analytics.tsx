import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";

export const Route = createFileRoute("/dev/analytics")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AnalyticsDashboard />
    </ProtectedRoute>
  ),
});
