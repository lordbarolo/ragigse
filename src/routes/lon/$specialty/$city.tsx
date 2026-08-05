import { createFileRoute } from "@tanstack/react-router";
import LonSpecialtyCity from "@/pages/LonSpecialtyCity";

export const Route = createFileRoute("/lon/$specialty/$city")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, follow" }],
  }),
  component: LonSpecialtyCity,
});
