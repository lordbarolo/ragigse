import { createFileRoute } from "@tanstack/react-router";
import Faktasidor from "@/pages/Faktasidor";

export const Route = createFileRoute("/faktasidor")({
  component: Faktasidor,
});
