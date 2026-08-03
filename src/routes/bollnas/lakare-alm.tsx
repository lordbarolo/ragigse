import { createFileRoute } from "@tanstack/react-router";
import BollnasAllmanspecialistReport from "@/pages/BollnasAllmanspecialistReport";

// Covers both /bollnas/lakare-alm and /Bollnas/lakare-alm — TanStack Router
// matches paths case-insensitively by default.
export const Route = createFileRoute("/bollnas/lakare-alm")({
  component: BollnasAllmanspecialistReport,
});
