import { createFileRoute } from "@tanstack/react-router";
import AllmanmedicinReport from "@/pages/AllmanmedicinReport";

export const Route = createFileRoute("/rapport/lakare-allmanmedicin")({
  component: AllmanmedicinReport,
});
