import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";

/** Rollback-säkerhet: tidigare startsida, avindexerad dev-route. */
export const Route = createFileRoute("/demo/old-home")({
  head: () => ({
    meta: [
      { title: "Tidigare startsida — intern" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Home,
});
