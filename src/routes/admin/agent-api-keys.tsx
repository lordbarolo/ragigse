import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import AgentApiKeys from "@/pages/admin/AgentApiKeys";

export const Route = createFileRoute("/admin/agent-api-keys")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AgentApiKeys />
    </ProtectedRoute>
  ),
});
