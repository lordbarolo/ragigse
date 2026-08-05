import { createFileRoute } from "@tanstack/react-router";
import Campaign from "@/pages/Campaign";

export const Route = createFileRoute("/kampanj/$role")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, follow" }],
  }),
  component: Campaign,
});
