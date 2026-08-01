import { createFileRoute } from "@tanstack/react-router";
import Campaign from "@/pages/Campaign";

export const Route = createFileRoute("/kampanj/$role")({
  component: Campaign,
});
