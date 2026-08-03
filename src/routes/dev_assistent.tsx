import { createFileRoute } from "@tanstack/react-router";
import DevAssistent from "@/pages/DevAssistent";

export const Route = createFileRoute("/dev_assistent")({
  component: DevAssistent,
});
