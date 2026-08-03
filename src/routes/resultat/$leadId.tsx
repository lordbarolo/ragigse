import { createFileRoute } from "@tanstack/react-router";
import AnalysisScreen from "@/pages/AnalysisScreen";

export const Route = createFileRoute("/resultat/$leadId")({
  component: AnalysisScreen,
});
