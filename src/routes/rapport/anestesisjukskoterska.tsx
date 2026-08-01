import { createFileRoute } from "@tanstack/react-router";
import AnestesiReport from "@/pages/AnestesiReport";

export const Route = createFileRoute("/rapport/anestesisjukskoterska")({
  component: AnestesiReport,
});
