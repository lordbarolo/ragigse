import { createFileRoute } from "@tanstack/react-router";
import ConsultantLayout from "@/layouts/ConsultantLayout";

export const Route = createFileRoute("/consultant/_layout")({
  component: ConsultantLayout,
});
