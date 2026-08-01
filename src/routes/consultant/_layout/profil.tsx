import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Profile from "@/pages/Profile";

export const Route = createFileRoute("/consultant/_layout/profil")({
  component: () => (
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  ),
});
