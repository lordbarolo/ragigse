import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminHealth from "@/pages/admin/Health";

export const Route = createFileRoute("/admin/health")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminHealth />
    </ProtectedRoute>
  ),
});
