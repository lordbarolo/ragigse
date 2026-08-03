import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/admin/")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Admin />
    </ProtectedRoute>
  ),
});
